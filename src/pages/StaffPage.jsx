import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GithubIcon } from "../components/common/BrandIcons";
import {
  UserPlus, RefreshCw, Crown, ShieldCheck, User, Clock, Ban, Trash2, KeyRound, History, LogOut,
  Loader2, Mail, Dices, CheckCircle2, Lock, MoreHorizontal,
} from "lucide-react";
import GoogleIcon from "../components/common/GoogleIcon";
import PageHeader from "../components/common/PageHeader";
import Modal from "../components/common/Modal";
import Confirm from "../components/common/Confirm";
import Field from "../components/common/Field";
import FilterChips from "../components/common/FilterChips";
import { SearchBox, EmptyState } from "../components/common/Toolbar";
import { btnPrimary, btnGhost, inputCls } from "../components/common/ui";
import { useAuth, passwordProblem } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { callStaff, ROLE_NAME } from "../lib/appwrite";
import { timeAgo, fullTime } from "../lib/time";

const ROLE_STYLE = {
  superadmin: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-gold-300",
  employee: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};
const ROLE_ICON = { superadmin: Crown, admin: ShieldCheck, employee: User, pending: Clock };

const randomPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const pick = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => chars[x % chars.length]).join("");
  return `${pick(8)}${Math.floor(10 + Math.random() * 89)}`;
};

function RoleBadge({ role }) {
  const Icon = ROLE_ICON[role] || User;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLE[role]}`}>
      <Icon className="h-3 w-3" /> {ROLE_NAME[role]}
    </span>
  );
}

function Provider({ p }) {
  if (p === "github") return <GithubIcon className="h-3.5 w-3.5" />;
  if (p === "google") return <GoogleIcon className="h-3.5 w-3.5" />;
  return <Mail className="h-3.5 w-3.5" title="Email & password" />;
}

function StaffPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" });
  const [formErr, setFormErr] = useState({});
  const [created, setCreated] = useState(null);

  const [menu, setMenu] = useState(null); // user id
  const menuRef = useRef(null);
  const [roleFor, setRoleFor] = useState(null);
  const [pwFor, setPwFor] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState(null); // { type, u }
  const [history, setHistory] = useState(null); // { u, sessions, loading }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await callStaff({ action: "list" });
      setRows(res.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(initial);
  }, [load]);

  useEffect(() => {
    if (menu === null) return;
    const closeOnOutsideClick = (event) => {
      if (menuRef.current?.contains(event.target) || event.target.closest?.("[data-menu-btn]")) return;
      setMenu(null);
    };
    const closeOnScroll = () => setMenu(null);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const count = (r) => rows.filter((u) => u.role === r).length;
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter((u) => (filter === "all" || u.role === filter) && (!t || `${u.name} ${u.email}`.toLowerCase().includes(t)));
  }, [rows, filter, query]);

  const run = async (payload, okMsg) => {
    setBusy(true);
    try {
      await callStaff(payload);
      if (okMsg) toast.success(okMsg);
      await load();
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => {
    setForm({ name: "", email: "", password: randomPassword(), role: "employee" });
    setFormErr({});
    setCreated(null);
    setAddOpen(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 2) err.name = "Enter the person's name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) err.email = "Enter a valid email";
    const pw = passwordProblem(form.password);
    if (pw) err.password = pw;
    setFormErr(err);
    if (Object.keys(err).length) return;
    const ok = await run({ action: "create", name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role });
    if (ok) setCreated({ ...form, role: user.isSuper ? form.role : "pending" });
  };

  const doConfirm = async () => {
    const { type, u } = confirm;
    const payloads = {
      delete: [{ action: "delete", userId: u.id }, `${u.name} was deleted`],
      block: [{ action: "setBlocked", userId: u.id, blocked: true }, `${u.name} is blocked`],
      unblock: [{ action: "setBlocked", userId: u.id, blocked: false }, `${u.name} is active again`],
      revoke: [{ action: "revokeSessions", userId: u.id }, `${u.name} was logged out everywhere`],
      owner: [{ action: "setRole", userId: u.id, role: "superadmin" }, `${u.name} is now the owner`],
      approve: [{ action: "setRole", userId: u.id, role: "employee" }, `${u.name} approved as Employee`],
    };
    const [payload, msg] = payloads[type];
    if (await run(payload, msg)) {
      setConfirm(null);
      if (type === "owner") await refreshUser().catch(() => {});
    }
  };

  const openHistory = async (u) => {
    setMenu(null);
    setHistory({ u, sessions: [], loading: true });
    try {
      const res = await callStaff({ action: "sessions", userId: u.id });
      setHistory({ u, sessions: res.sessions, loading: false });
    } catch (e) {
      toast.error(e.message);
      setHistory(null);
    }
  };

  const confirmText = {
    delete: ["Delete this user?", "Their account is permanently removed from Appwrite and they can no longer log in.", "Delete", true],
    block: ["Block this user?", "They are logged out immediately and cannot log in until you unblock them.", "Block", true],
    unblock: ["Unblock this user?", "They will be able to log in again.", "Unblock", false],
    revoke: ["Log out everywhere?", "All their active sessions on every device are ended.", "Log out", false],
    owner: ["Make this person the owner?", "There is only one owner. They become Super Admin and you become an Admin.", "Transfer ownership", true],
    approve: ["Approve as Employee?", "They get access to do day-to-day work (add customers, policies, claims).", "Approve", false],
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" subtitle={user.isSuper ? "Control who can access SafeHavenInsure and what they can do." : "Add employees and see who is working."}>
        <button onClick={load} className={btnGhost} title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        <button onClick={openAdd} className={btnPrimary}><UserPlus className="h-4 w-4" /> Add {user.isSuper ? "User" : "Employee"}</button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["superadmin", "Super Admins"],
          ["admin", "Admins"],
          ["employee", "Employees"],
          ["pending", "Waiting approval"],
        ].filter(([r]) => user.isSuper || r === "employee" || r === "pending").map(([r, label]) => {
          const Icon = ROLE_ICON[r];
          return (
            <div key={r} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ROLE_STYLE[r]}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-gray-900 dark:text-white">{count(r)}</p>
            </div>
          );
        })}
      </div>

      {!user.isSuper && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-gold-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>You can add employees and see their login history. New employees wait for the Super Admin to approve them. Only the Super Admin can change roles, reset passwords or delete users.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Search name or email" />
        {user.isSuper && (
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: rows.length },
              { value: "superadmin", label: "Super Admin", count: count("superadmin") },
              { value: "admin", label: "Admin", count: count("admin") },
              { value: "employee", label: "Employee", count: count("employee") },
              { value: "pending", label: "Pending", count: count("pending") },
            ]}
          />
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      {loading && !rows.length ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-slate-800" />)}</div>
      ) : filtered.length === 0 && !error ? (
        <EmptyState icon={User} title="No users here" text="Add your first employee to get started." action={<button onClick={openAdd} className={btnPrimary}><UserPlus className="h-4 w-4" /> Add Employee</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className={`relative animate-fade-up flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition hover:border-gold-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-gold-500/40 sm:flex-row sm:items-center ${menu === u.id ? "z-30" : "z-0"}`}>
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-luxe font-display text-lg font-bold text-white">{u.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <span className="truncate">{u.name}</span>
                    {u.isMe && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-slate-800 dark:text-slate-400">You</span>}
                    {u.blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600 dark:bg-red-500/15 dark:text-red-400">Blocked</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">{u.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:justify-end">
                <RoleBadge role={u.role} />
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400" title="Sign-in method">
                  {(u.providers.length ? u.providers : ["email"]).map((p) => <Provider key={p} p={p} />)}
                </span>
                {user.isSuper && (
                  <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-slate-400" title={u.since ? fullTime(new Date(u.since).toISOString()) : ""}>
                    <span className={`h-2 w-2 rounded-full ${u.online ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {u.online ? `Online · logged in ${timeAgo(new Date(u.since).toISOString())}` : u.since ? `Offline · last login ${timeAgo(new Date(u.since).toISOString())}` : "Offline · never logged in"}
                  </span>
                )}
              </div>
              <div className="relative flex shrink-0 gap-2">
                {u.role === "pending" && user.isSuper && (
                  <button onClick={() => setConfirm({ type: "approve", u })} className={`${btnPrimary} px-3 py-2 text-xs`}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                )}
                <button onClick={() => openHistory(u)} className={`${btnGhost} px-3 py-2 text-xs`}><History className="h-3.5 w-3.5" /> Logins</button>
                {user.isSuper && !u.isMe && (
                  <>
                    <button data-menu-btn onClick={() => setMenu(menu === u.id ? null : u.id)} className={`${btnGhost} px-2.5 py-2`} aria-label="More"><MoreHorizontal className="h-4 w-4" /></button>
                    {menu === u.id && (
                      <div ref={menuRef} className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-800">
                        {[
                          ["Change role", Crown, () => setRoleFor(u)],
                          ["Reset password", KeyRound, () => { setNewPw(randomPassword()); setPwFor(u); }],
                          [u.blocked ? "Unblock" : "Block", Ban, () => setConfirm({ type: u.blocked ? "unblock" : "block", u })],
                          ["Log out everywhere", LogOut, () => setConfirm({ type: "revoke", u })],
                          ["Delete user", Trash2, () => setConfirm({ type: "delete", u }), true],
                        ].map(([label, Icon, fn, danger]) => (
                          <button key={label} onClick={() => { setMenu(null); fn(); }} className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-slate-700 ${danger ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-slate-200"}`}>
                            <Icon className="h-4 w-4" /> {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add user */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={created ? "User created" : user.isSuper ? "Add a user" : "Add an employee"}>
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-300">Share these login details with <b>{created.name}</b>. They can change the password later from Profile.</p>
            <div className="space-y-2 rounded-xl bg-gray-50 p-4 font-mono text-sm dark:bg-slate-800">
              <p>Email: <b>{created.email}</b></p>
              <p>Password: <b>{created.password}</b></p>
              <p>Role: <b>{ROLE_NAME[created.role]}</b></p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => navigator.clipboard?.writeText(`Email: ${created.email}\nPassword: ${created.password}`).then(() => toast.success("Copied"))} className={btnGhost}>Copy</button>
              <button onClick={() => setAddOpen(false)} className={btnPrimary}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitAdd} className="space-y-4">
            <Field label="Full name" error={formErr.name}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Email" error={formErr.email}><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
            <Field label="Temporary password" error={formErr.password}>
              <div className="flex gap-2">
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputCls} font-mono`} />
                <button type="button" onClick={() => setForm({ ...form, password: randomPassword() })} className={`${btnGhost} px-3`} title="Generate"><Dices className="h-4 w-4" /></button>
              </div>
            </Field>
            <Field label="Role">
              <div className={`grid gap-3 ${user.isSuper ? "grid-cols-2" : "grid-cols-1"}`}>
                {[
                  ["employee", "Employee", "Does daily work"],
                  ["admin", "Admin", "Views all, adds employees"],
                ].filter(([r]) => user.isSuper || r === "employee").map(([r, t, d]) => (
                  <button type="button" key={r} onClick={() => setForm({ ...form, role: r })} className={`rounded-xl border p-3 text-left transition ${form.role === r ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20 dark:border-gold-400 dark:bg-gold-500/10" : "border-gray-200 hover:border-blue-300 dark:border-slate-700"}`}>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{d}</p>
                  </button>
                ))}
              </div>
            </Field>
            <p className="text-xs text-gray-500 dark:text-slate-400">They can also sign in with Google or GitHub using this same email.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setAddOpen(false)} className={btnGhost}>Cancel</button>
              <button disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create user</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Change role */}
      <Modal open={!!roleFor} onClose={() => setRoleFor(null)} title={`Change role: ${roleFor?.name || ""}`}>
        <div className="space-y-3">
          {["superadmin", "admin", "employee", "pending"].filter((r) => roleFor?.role !== "pending" || r !== "superadmin").map((r) => (
            <button
              key={r}
              disabled={busy || r === roleFor?.role}
              onClick={async () => {
                if (r === "superadmin") { setConfirm({ type: "owner", u: roleFor }); setRoleFor(null); return; }
                if (await run({ action: "setRole", userId: roleFor.id, role: r }, `${roleFor.name} is now ${ROLE_NAME[r]}`)) setRoleFor(null);
              }}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition disabled:opacity-60 ${r === roleFor?.role ? "border-blue-600 bg-blue-50 dark:border-gold-400 dark:bg-gold-500/10" : "border-gray-200 hover:border-blue-300 dark:border-slate-700"}`}
            >
              <RoleBadge role={r} />
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {{ superadmin: "Becomes the owner, you become Admin", admin: "View everything, add employees", employee: "Do daily work", pending: "No access" }[r]}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Reset password */}
      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`Reset password: ${pwFor?.name || ""}`}>
        <div className="space-y-4">
          <Field label="New password" hint="They are logged out everywhere. Share this with them.">
            <div className="flex gap-2">
              <input value={newPw} onChange={(e) => setNewPw(e.target.value)} className={`${inputCls} font-mono`} />
              <button type="button" onClick={() => setNewPw(randomPassword())} className={`${btnGhost} px-3`}><Dices className="h-4 w-4" /></button>
            </div>
          </Field>
          <div className="flex justify-end gap-3">
            <button onClick={() => setPwFor(null)} className={btnGhost}>Cancel</button>
            <button
              disabled={busy}
              className={btnPrimary}
              onClick={async () => {
                const p = passwordProblem(newPw);
                if (p) return toast.error(p);
                if (await run({ action: "resetPassword", userId: pwFor.id, password: newPw }, "Password changed")) {
                  navigator.clipboard?.writeText(newPw).catch(() => {});
                  setPwFor(null);
                }
              }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password
            </button>
          </div>
        </div>
      </Modal>

      {/* Login history */}
      <Modal open={!!history} onClose={() => setHistory(null)} title={`Login history: ${history?.u.name || ""}`}>
        {history?.loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
        ) : history?.sessions.length ? (
          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto dark:divide-slate-800">
            {history.sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900 dark:text-white">{s.device}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{s.provider === "email" ? "Email" : s.provider} · {s.ip}{s.country ? ` · ${s.country}` : ""}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">{fullTime(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">No active sessions. Full login/logout history is on the Activity page.</p>
        )}
      </Modal>

      <Confirm
        open={!!confirm}
        danger={confirmText[confirm?.type]?.[3]}
        title={confirmText[confirm?.type]?.[0] || ""}
        message={confirm ? `${confirm.u.name}: ${confirmText[confirm.type][1]}` : ""}
        confirmLabel={confirmText[confirm?.type]?.[2]}
        disabled={busy}
        onConfirm={doConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

export default StaffPage;
