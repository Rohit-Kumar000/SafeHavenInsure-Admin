// Who can appear in chat. Shared by the sidebar dot and the chat page.
// "contacts" are the people the user may message; "people" is everyone active (blocked and
// deleted users are not included), used to show roles and hide dead conversations.
import { callStaff } from "./appwrite";

const TTL = 45000;
let cache = null;
let at = 0;
let inflight = null;

export function peekChatPeople() {
  return cache;
}

export function loadChatPeople(force = false) {
  if (!force && cache && Date.now() - at < TTL) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = callStaff({ action: "contacts" })
    .then((r) => {
      cache = { contacts: r.contacts || [], people: r.people || [] };
      at = Date.now();
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function resetChatPeople() {
  cache = null;
  at = 0;
}
