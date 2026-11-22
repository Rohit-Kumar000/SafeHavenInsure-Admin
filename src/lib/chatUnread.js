// WhatsApp-style unread tracking.
//
// A conversation is unread while it holds messages sent to this person that are newer than the last
// message they saw. Opening the conversation clears it at once (stored on this device so the dot
// disappears instantly) and the read position is also saved to the person's account so the dot
// clears on their other devices too.
import { useEffect, useState } from "react";
import { account, client, config, databases, Query } from "./appwrite";
import { loadChatPeople, peekChatPeople } from "./chatDirectory";

const key = (uid) => `sh_chat_read_${uid}`;
const getRead = (uid) => { try { return JSON.parse(localStorage.getItem(key(uid)) || "{}"); } catch { return {}; } };
const saveRead = (uid, r) => { try { localStorage.setItem(key(uid), JSON.stringify(r)); } catch { /* ignore */ } };
const ts = (iso) => Date.parse(iso) || 0; // compare as numbers, formats like "Z" and "+00:00" differ as text

// Merge two read maps, keeping the newest position per conversation.
function merge(a, b) {
  const out = { ...a };
  Object.entries(b || {}).forEach(([pair, at]) => {
    if (pair === "_base") return;
    if (!out[pair] || ts(at) > ts(out[pair])) out[pair] = at;
  });
  return out;
}

let pushTimer = null;
function schedulePush(uid) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void syncRead(uid); }, 1200);
}

// Pull read positions saved on other devices, merge them and push ours back.
export async function syncRead(uid) {
  try {
    const prefs = (await account.getPrefs()) || {};
    const local = getRead(uid);
    const merged = merge(local, prefs.chatRead);
    if (JSON.stringify(merged) !== JSON.stringify(local)) {
      saveRead(uid, { ...merged, _base: local._base });
      window.dispatchEvent(new Event("sh-chat-read"));
    }
    const remote = prefs.chatRead || {};
    const pairs = Object.keys(merged).filter((k) => k !== "_base");
    const changed = pairs.some((p) => !remote[p] || ts(merged[p]) > ts(remote[p]));
    if (changed) {
      // Keep the 150 most recent conversations so the profile data stays small.
      const keep = pairs.sort((x, y) => ts(merged[y]) - ts(merged[x])).slice(0, 150);
      const chatRead = {};
      keep.forEach((p) => { chatRead[p] = merged[p]; });
      await account.updatePrefs({ ...prefs, chatRead });
    }
  } catch { /* offline or signed out: the local copy still works */ }
}

export function markRead(uid, pair, upTo) {
  const r = getRead(uid);
  const stamp = upTo || new Date().toISOString();
  if (r[pair] && ts(r[pair]) >= ts(stamp)) return;
  r[pair] = stamp;
  saveRead(uid, r);
  window.dispatchEvent(new Event("sh-chat-read"));
  schedulePush(uid);
}

// Messages that existed before tracking began on this device are treated as already seen.
function baseline(uid) {
  const r = getRead(uid);
  if (!r._base) {
    r._base = new Date().toISOString();
    saveRead(uid, r);
  }
  return r._base;
}

// Map of conversation key -> number of unread messages.
// Pass `visibleIds` (active people) to ignore conversations with blocked or deleted users.
export function unreadCounts(msgs, uid, visibleIds) {
  const base = baseline(uid);
  const r = getRead(uid);
  const out = new Map();
  msgs.forEach((m) => {
    if (m.toId !== uid) return;
    if (visibleIds && !visibleIds.has(m.fromId)) return;
    if (ts(m.$createdAt) > ts(r[m.pair] || base)) out.set(m.pair, (out.get(m.pair) || 0) + 1);
  });
  return out;
}

// Used by the sidebar: true while any conversation has an unread message.
export function useChatUnread(uid) {
  const [msgs, setMsgs] = useState([]);
  const [ids, setIds] = useState(() => (peekChatPeople() ? new Set(peekChatPeople().people.map((p) => p.id)) : null));
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;
    let alive = true;
    const load = () => databases.listDocuments(config.databaseId, "messages", [Query.equal("toId", uid), Query.orderDesc("$createdAt"), Query.limit(100)])
      .then((r) => { if (alive) setMsgs(r.documents); }).catch(() => {});
    const people = (force) => loadChatPeople(force).then((d) => { if (alive) setIds(new Set(d.people.map((p) => p.id))); }).catch(() => {});
    load();
    people(false);
    void syncRead(uid);
    const off = client.subscribe(`databases.${config.databaseId}.collections.messages.documents`, () => { load(); people(false); });
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("sh-chat-read", bump);
    const onVisible = () => { if (document.visibilityState === "visible") { load(); void syncRead(uid); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; off(); window.removeEventListener("sh-chat-read", bump); document.removeEventListener("visibilitychange", onVisible); };
  }, [uid]);

  return unreadCounts(msgs, uid, ids || undefined).size > 0;
}
