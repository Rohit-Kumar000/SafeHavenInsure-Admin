import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, MessageCircle, Eye, Trash2, Loader2, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { callStaff, client, config, databases, Query, ROLE_NAME } from "../lib/appwrite";
import { timeAgo } from "../lib/time";
import { markRead, unreadCounts, syncRead } from "../lib/chatUnread";
import { loadChatPeople } from "../lib/chatDirectory";
import Confirm from "../components/common/Confirm";

const clock = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Everyone can see at a glance who is the Super Admin, an Admin or an Employee.
const ROLE_STYLE = {
  superadmin: "bg-gray-600 text-gold-300 dark:bg-gold-300 dark:text-blue-950",
  admin: "bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-gold-200",
  employee: "bg-gold-200 text-gold-800 dark:bg-slate-700 dark:text-gold-200",
};

function RoleBadge({ role, className = "" }) {
  if (!role || !ROLE_STYLE[role]) return null;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ROLE_STYLE[role]} ${className}`}>
      {ROLE_NAME[role]}
    </span>
  );
}

function Initial({ name, className }) {
  return <span className={`${className} flex items-center justify-center rounded-full bg-gold-sheen font-bold text-blue-950`}>{(name || "?").charAt(0).toUpperCase()}</span>;
}

function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [dir, setDir] = useState(null); // { contacts, people } once loaded
  const [msgs, setMsgs] = useState([]);
  const [active, setActive] = useState(null); // conversation key
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await databases.listDocuments(config.databaseId, "messages", [Query.orderDesc("$createdAt"), Query.limit(500)]);
      setMsgs(r.documents.reverse());
    } catch { /* collection is created by the setup script */ }
  }, []);

  const loadPeople = useCallback((force) => loadChatPeople(force).then(setDir).catch((e) => toast.error(e.message)), [toast]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); void loadPeople(true); void syncRead(user.id); }, 0);
    // Live updates: new, deleted or removed messages refresh the list; people are re-checked so
    // blocked or deleted users disappear without a reload.
    const off = client.subscribe(`databases.${config.databaseId}.collections.messages.documents`, () => { void load(); void loadPeople(false); });
    const poll = setInterval(() => { void loadPeople(true); }, 60000);
    return () => { clearTimeout(t); clearInterval(poll); off(); };
  }, [load, loadPeople, user.id]);

  const peopleMap = useMemo(() => new Map((dir?.people || []).map((p) => [p.id, p])), [dir]);
  const contactIds = useMemo(() => new Set((dir?.contacts || []).map((c) => c.id)), [dir]);

  // One entry per conversation, newest first. Conversations with blocked or deleted people are hidden.
  const list = useMemo(() => {
    if (!dir) return [];
    const map = new Map();
    msgs.forEach((m) => {
      const mine = m.fromId === user.id || m.toId === user.id;
      if (mine) {
        const otherId = m.fromId === user.id ? m.toId : m.fromId;
        const other = peopleMap.get(otherId);
        if (!other) return;
        map.set(m.pair, { key: m.pair, mine: true, title: other.name, role: other.role, toId: otherId, last: m });
      } else {
        const a = peopleMap.get(m.fromId);
        const b = peopleMap.get(m.toId);
        if (!a || !b) return;
        map.set(m.pair, { key: m.pair, mine: false, title: `${a.name} ↔ ${b.name}`, roles: [a.role, b.role], toId: null, last: m });
      }
    });
    dir.contacts.forEach((c) => {
      const key = [user.id, c.id].sort().join("_");
      if (!map.has(key)) map.set(key, { key, mine: true, title: c.name, role: c.role, toId: c.id, last: null });
    });
    const q = query.trim().toLowerCase();
    return [...map.values()]
      .filter((c) => !q || c.title.toLowerCase().includes(q) || (c.role && ROLE_NAME[c.role].toLowerCase().includes(q)))
      .sort((a, b) => (b.last?.$createdAt || "").localeCompare(a.last?.$createdAt || ""));
  }, [dir, msgs, peopleMap, user.id, query]);

  const mineList = list.filter((c) => c.mine);
  const othersList = list.filter((c) => !c.mine);

  const current = list.find((c) => c.key === active);
  const unread = useMemo(() => unreadCounts(msgs, user.id, new Set(peopleMap.keys())), [msgs, user.id, peopleMap]);
  const thread = useMemo(() => {
    const rows = msgs.filter((m) => m.pair === active).map((m) => ({ ...m, day: dayLabel(m.$createdAt) }));
    return rows.map((m, i) => ({ ...m, showDay: i === 0 || rows[i - 1].day !== m.day }));
  }, [msgs, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [thread.length, active]);

  // Opening a conversation (or receiving a message while it is open) clears its dot, like WhatsApp.
  const latestIncoming = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) if (thread[i].toId === user.id) return thread[i].$createdAt;
    return null;
  }, [thread, user.id]);
  useEffect(() => {
    if (!active || !latestIncoming) return undefined;
    const mark = () => { if (document.visibilityState === "visible") markRead(user.id, active, latestIncoming); };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [active, latestIncoming, user.id]);

  // If the open conversation disappears (person deleted/blocked, or chat deleted), the list is shown again.
  const canReply = !!current?.mine && !!current.toId && contactIds.has(current.toId);
  // Super Admin can delete any chat; Admin only chats with employees; employees cannot delete.
  const canDelete = !!current?.last && (user.isSuper || (user.isAdmin && current.mine && current.role === "employee"));

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !current?.toId || sending) return;
    setSending(true);
    try {
      await callStaff({ action: "send", toId: current.toId, text: body });
      setText("");
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const removeChat = async () => {
    if (!current || deleting) return;
    setDeleting(true);
    try {
      await callStaff({ action: "deleteChat", pair: current.key });
      setMsgs((all) => all.filter((m) => m.pair !== current.key));
      setConfirmDelete(false);
      setActive(null);
      toast.success("Chat deleted");
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderRow = (c) => {
    const n = unread.get(c.key) || 0;
    return (
      <button key={c.key} onClick={() => setActive(c.key)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800 ${active === c.key ? "bg-gold-100 dark:bg-slate-800" : ""}`}>
        <Initial name={c.mine ? c.title : "↔"} className="h-11 w-11 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm text-gray-900 dark:text-white ${n ? "font-bold" : "font-semibold"}`}>{c.title}</span>
            {c.last && <span className={`shrink-0 text-[11px] ${n ? "font-semibold text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`}>{timeAgo(c.last.$createdAt)}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            {c.mine ? <RoleBadge role={c.role} /> : c.roles.map((r, i) => <RoleBadge key={i} role={r} />)}
            <span className={`min-w-0 flex-1 truncate text-xs ${n ? "font-semibold text-gray-800 dark:text-slate-100" : "text-gray-500 dark:text-slate-400"}`}>
              {c.last ? `${c.last.fromId === user.id ? "You: " : ""}${c.last.text}` : "Start a chat"}
            </span>
            {n > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">{n > 99 ? "99+" : n}</span>
            )}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[420px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white dark:bg-slate-900 shadow-sm sm:h-[calc(100dvh-9rem)]">
      {/* Conversation list */}
      <div className={`${current ? "hidden md:flex" : "flex"} w-full flex-col border-r border-gray-200 dark:border-slate-700 md:w-80 md:shrink-0`}>
        <div className="space-y-3 border-b border-gray-200 dark:border-slate-700 p-4">
          <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Chat</h1>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-base outline-none focus:border-blue-600 sm:text-sm" />
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto">
          {!dir && <p className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading chats...</p>}
          {dir && list.length === 0 && <p className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">No one to chat with yet.</p>}
          {mineList.map(renderRow)}
          {othersList.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 border-y border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-950 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400"><Eye className="h-3.5 w-3.5" /> Staff conversations (view only)</p>
              {othersList.map(renderRow)}
            </>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`${current ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!current ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-gray-50 text-gray-400 dark:bg-slate-950 dark:text-slate-500">
            <MessageCircle className="h-12 w-12" />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 px-3 py-3 sm:px-4">
              <button onClick={() => setActive(null)} className="rounded-lg p-1.5 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 md:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
              <Initial name={current.mine ? current.title : "↔"} className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{current.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {current.mine ? <RoleBadge role={current.role} /> : current.roles.map((r, i) => <RoleBadge key={i} role={r} />)}
                  {!current.mine && <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400"><Eye className="h-3 w-3" /> View only</span>}
                </div>
              </div>
              {canDelete && (
                <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-2 text-gray-500 dark:text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600" aria-label="Delete chat" title="Delete chat">
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto bg-gray-100 dark:bg-slate-950 p-3 sm:p-4">
              {thread.length === 0 && <p className="py-10 text-center text-sm text-gray-500 dark:text-slate-400">No messages yet. Say hello to {current.title}.</p>}
              {thread.map((m) => {
                const me = m.fromId === user.id;
                const sender = peopleMap.get(m.fromId);
                return (
                  <div key={m.$id}>
                    {m.showDay && <p className="my-3 text-center"><span className="rounded-full bg-gold-200 px-3 py-1 text-[11px] font-semibold text-gold-800 dark:bg-slate-800 dark:text-gold-300">{m.day}</span></p>}
                    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[75%] ${me ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-white text-gray-800 dark:bg-slate-800 dark:text-slate-100"}`}>
                        {!current.mine && (
                          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-slate-300">
                            {m.fromName} <RoleBadge role={sender?.role || m.fromRole} />
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`mt-1 text-right text-[10px] ${me ? "text-white/80" : "text-gray-500 dark:text-slate-400"}`}>{clock(m.$createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {current.mine && !canReply && (
              <p className="flex items-center justify-center gap-2 border-t border-gray-200 dark:border-slate-700 p-3 text-center text-xs text-gray-600 dark:text-slate-300">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {user.isEmployee ? "Employees can only chat with Admins. You cannot reply to this person." : "You cannot reply to this conversation."}
              </p>
            )}
            {canReply && (
              <form onSubmit={send} className="flex items-center gap-2 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message" className="min-w-0 flex-1 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-base text-gray-800 dark:text-slate-100 outline-none focus:border-blue-600 sm:text-sm" />
                <button disabled={!text.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50" aria-label="Send"><Send className="h-4 w-4" /></button>
              </form>
            )}
          </>
        )}
      </div>

      <Confirm
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="Delete this chat?"
        danger
        confirmLabel={deleting ? "Deleting..." : "Delete chat"}
        disabled={deleting}
        message={current?.mine
          ? `All messages between you and ${current?.title} will be deleted for both of you. This cannot be undone.`
          : "All messages in this conversation will be deleted for both people. This cannot be undone."}
        onConfirm={removeChat}
      />
    </div>
  );
}

export default ChatPage;
