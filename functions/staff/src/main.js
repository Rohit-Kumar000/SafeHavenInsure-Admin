const ROLES = ["superadmin", "admin", "employee"];
const roleOf = (labels = []) => ROLES.find((r) => labels.includes(r)) || "pending";
const withRole = (labels = [], role) => [...labels.filter((l) => !ROLES.includes(l)), ...(role === "pending" ? [] : [role])];

export default async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = req.headers["x-appwrite-key"];
  const callerId = req.headers["x-appwrite-user-id"];

  const fail = (msg, code = 400) => res.json({ ok: false, error: msg }, code);

  if (!callerId) return fail("Please log in first", 401);
  if (!key) return fail("Function scopes are missing (users.read, users.write)", 500);

  const api = async (method, path, body) => {
    const r = await fetch(endpoint + path, {
      method,
      headers: { "Content-Type": "application/json", "X-Appwrite-Project": project, "X-Appwrite-Key": key },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    if (!r.ok) {
      const e = new Error(data.message || r.statusText);
      e.code = r.status;
      throw e;
    }
    return data;
  };

  let input;
  try {
    input = req.bodyJson ?? (req.bodyText ? JSON.parse(req.bodyText) : {});
  } catch {
    return fail("Invalid request");
  }
  const { action } = input;

  const q = (o) => encodeURIComponent(JSON.stringify(o));
  const listUsers = async () => {
    const { users } = await api("GET", `/users?queries[0]=${q({ method: "limit", values: [200] })}&queries[1]=${q({ method: "orderDesc", attribute: "$createdAt" })}`);
    return users;
  };

  try {
    const caller = await api("GET", `/users/${callerId}`);
    if (caller.status === false) return fail("Your account is blocked", 403);
    const role = roleOf(caller.labels);
    const isSuper = role === "superadmin";
    const isAdmin = role === "admin";

    if (action === "me") return res.json({ ok: true, role });

    // ---------------- presence: called every minute by the app while it is open ----------------
    if (action === "ping") {
      const prefs = caller.prefs || {};
      const now = Date.now();
      const fresh = prefs.lastSeen && now - prefs.lastSeen < 150000;
      const next = input.offline ? { ...prefs, lastSeen: 0 } : { ...prefs, lastSeen: now, since: fresh ? prefs.since : now };
      await api("PATCH", `/users/${callerId}/prefs`, { prefs: next });
      return res.json({ ok: true });
    }

    // ---------------- chat: who can talk to whom ----------------
    const canChat = (from, to) => {
      if (from === "superadmin") return to !== "pending";
      if (from === "admin") return to === "superadmin" || to === "employee";
      if (from === "employee") return to === "admin";
      return false;
    };
    const nameOf = (u) => u.name || u.email?.split("@")[0] || "User";
    if (action === "contacts") {
      const users = await listUsers();
      // Blocked users and users without a role are never shown in chat.
      const active = users.filter((u) => u.status !== false && roleOf(u.labels) !== "pending");
      return res.json({
        ok: true,
        contacts: active
          .filter((u) => u.$id !== callerId && canChat(role, roleOf(u.labels)))
          .map((u) => ({ id: u.$id, name: nameOf(u), role: roleOf(u.labels) })),
        // Everyone who can appear in a conversation, so the app can label each person's role
        // and hide conversations with people who were blocked or deleted.
        people: active.map((u) => ({ id: u.$id, name: nameOf(u), role: roleOf(u.labels) })),
      });
    }
    if (action === "send") {
      const text = String(input.text || "").trim().slice(0, 2000);
      if (!text) return fail("Write a message first");
      const to = await api("GET", `/users/${input.toId}`);
      if (to.status === false) return fail("This person is blocked and cannot receive messages", 403);
      if (!canChat(role, roleOf(to.labels))) return fail("You cannot message this person", 403);
      const DB = process.env.DB_ID || "safehaven";
      const doc = await api("POST", `/databases/${DB}/collections/messages/documents`, {
        documentId: "unique()",
        data: {
          pair: [callerId, to.$id].sort().join("_"), fromId: callerId, fromName: caller.name || "User", fromRole: role,
          toId: to.$id, toName: to.name || "User", text,
        },
        permissions: [`read("user:${callerId}")`, `read("user:${to.$id}")`],
      });
      return res.json({ ok: true, id: doc.$id });
    }

    // ---------------- chat clean-up ----------------
    const DB = process.env.DB_ID || "safehaven";
    const messagesIn = async (pair, limit = 100) => {
      const r = await api("GET", `/databases/${DB}/collections/messages/documents?queries[0]=${q({ method: "equal", attribute: "pair", values: [pair] })}&queries[1]=${q({ method: "limit", values: [limit] })}`);
      return r.documents;
    };
    const purgePair = async (pair) => {
      let removed = 0;
      for (;;) {
        const docs = await messagesIn(pair);
        if (!docs.length) break;
        for (const d of docs) {
          await api("DELETE", `/databases/${DB}/collections/messages/documents/${d.$id}`).catch(() => {});
          removed += 1;
        }
        if (docs.length < 100) break;
      }
      return removed;
    };

    if (action === "deleteChat") {
      // Super Admin: any conversation. Admin: only their own conversations with employees. Employees: none.
      const pair = String(input.pair || "");
      if (!pair) return fail("Conversation is required");
      if (!isSuper && !isAdmin) return fail("You do not have permission to delete chats", 403);
      const [first] = await messagesIn(pair, 1);
      if (!first) return res.json({ ok: true, removed: 0 });
      if (!isSuper) {
        if (first.fromId !== callerId && first.toId !== callerId) return fail("You can only delete your own conversations", 403);
        const otherId = first.fromId === callerId ? first.toId : first.fromId;
        const other = await api("GET", `/users/${otherId}`).catch(() => null);
        if (other && roleOf(other.labels) !== "employee") return fail("Admins can only delete chats with employees", 403);
      }
      const removed = await purgePair(pair);
      return res.json({ ok: true, removed });
    }

    if (!isSuper && !isAdmin) return fail("You do not have permission to do this", 403);

    const superCount = async () => (await listUsers()).filter((u) => (u.labels || []).includes("superadmin")).length;
    const adminCanSee = (r) => r === "employee" || r === "pending";

    // ---------------- list ----------------
    if (action === "list") {
      const users = await listUsers();
      const providers = {};
      try {
        const { identities } = await api("GET", `/users/identities?queries[0]=${q({ method: "limit", values: [200] })}`);
        identities.forEach((i) => { (providers[i.userId] ||= []).push(i.provider); });
      } catch (e) {
        log("identities skipped: " + e.message);
      }
      const visible = users.filter((u) => isSuper || adminCanSee(roleOf(u.labels)));
      return res.json({
        ok: true,
        users: visible.map((u) => ({
          id: u.$id,
          name: u.name || u.email?.split("@")[0] || "User",
          email: u.email,
          role: roleOf(u.labels),
          blocked: u.status === false,
          providers: providers[u.$id] || (u.passwordUpdate ? ["email"] : []),
          createdAt: u.$createdAt,
          lastActive: u.accessedAt,
          isMe: u.$id === callerId,
          // Presence is visible to the Super Admin only.
          ...(isSuper ? {
            online: !!(u.prefs?.lastSeen && Date.now() - u.prefs.lastSeen < 150000),
            since: u.prefs?.since || null,
            lastSeen: u.prefs?.lastSeen || null,
          } : {}),
        })),
      });
    }

    // ---------------- create ----------------
    if (action === "create") {
      const { name, email, password, role: newRole } = input;
      if (!name || !email || !password) return fail("Name, email and password are required");
      if (String(password).length < 8) return fail("Password must be at least 8 characters");
      if (!ROLES.includes(newRole) || newRole === "superadmin") return fail("There is only one owner. Use Change role on an existing user to hand over ownership.");
      if (isAdmin && newRole !== "employee") return fail("Admins can only add employees", 403);
      // Users added by an Admin stay pending until the Super Admin approves them.
      const finalRole = isAdmin ? "pending" : newRole;
      const u = await api("POST", "/users", { userId: "unique()", email, password, name });
      await api("PATCH", `/users/${u.$id}/verification`, { emailVerification: true }).catch(() => {});
      await api("PUT", `/users/${u.$id}/labels`, { labels: withRole([], finalRole) });
      return res.json({ ok: true, id: u.$id, pending: finalRole === "pending" });
    }

    // ---------------- actions on a target user ----------------
    const { userId } = input;
    if (!userId) return fail("userId is required");
    const target = await api("GET", `/users/${userId}`);
    const targetRole = roleOf(target.labels);

    if (isAdmin && !adminCanSee(targetRole)) return fail("Admins cannot manage other admins or the owner", 403);

    if (action === "sessions") {
      const { sessions } = await api("GET", `/users/${userId}/sessions`);
      return res.json({
        ok: true,
        sessions: sessions.map((s) => ({
          id: s.$id, createdAt: s.$createdAt, provider: s.provider, ip: s.ip,
          device: [s.clientName, s.osName].filter(Boolean).join(" · ") || s.deviceName || "Unknown device",
          country: s.countryName || "", current: !!s.current,
        })),
      });
    }

    if (action === "setRole") {
      const { role: newRole } = input;
      if (![...ROLES, "pending"].includes(newRole)) return fail("Invalid role");
      // Approvals and role changes belong to the Super Admin only.
      if (isAdmin) return fail("Only the Super Admin can approve or change roles", 403);
      if (userId === callerId) return fail("Choose another person");
      if (newRole === "superadmin") {
        // There is exactly one owner: handing over makes the current owner an Admin.
        if (targetRole === "pending") return fail("Approve this user before making them the owner");
        await api("PUT", `/users/${userId}/labels`, { labels: withRole(target.labels, "superadmin") });
        await api("PUT", `/users/${callerId}/labels`, { labels: withRole(caller.labels, "admin") });
        return res.json({ ok: true });
      }
      if (targetRole === "superadmin") return fail("Hand over ownership to someone else first");
      await api("PUT", `/users/${userId}/labels`, { labels: withRole(target.labels, newRole) });
      return res.json({ ok: true });
    }

    if (!isSuper) return fail("Only the Super Admin can do this", 403);

    if (action === "setBlocked") {
      if (userId === callerId) return fail("You cannot block yourself");
      if (targetRole === "superadmin" && input.blocked && (await superCount()) <= 1) return fail("You cannot block the only Super Admin");
      await api("PATCH", `/users/${userId}/status`, { status: !input.blocked });
      if (input.blocked) await api("DELETE", `/users/${userId}/sessions`).catch(() => {});
      return res.json({ ok: true });
    }

    if (action === "resetPassword") {
      const { password } = input;
      if (!password || String(password).length < 8) return fail("Password must be at least 8 characters");
      await api("PATCH", `/users/${userId}/password`, { password });
      await api("DELETE", `/users/${userId}/sessions`).catch(() => {});
      return res.json({ ok: true });
    }

    if (action === "revokeSessions") {
      await api("DELETE", `/users/${userId}/sessions`);
      return res.json({ ok: true });
    }

    if (action === "delete") {
      if (userId === callerId) return fail("You cannot delete your own account");
      if (targetRole === "superadmin" && (await superCount()) <= 1) return fail("You cannot delete the only Super Admin");
      // Remove every conversation this person was part of (one conversation per other user).
      try {
        const others = (await listUsers()).filter((u) => u.$id !== userId);
        for (let i = 0; i < others.length; i += 10) {
          await Promise.all(others.slice(i, i + 10).map((u) => purgePair([userId, u.$id].sort().join("_")).catch(() => 0)));
        }
      } catch (e) {
        log("chat cleanup skipped: " + e.message);
      }
      await api("DELETE", `/users/${userId}`);
      return res.json({ ok: true });
    }

    return fail("Unknown action");
  } catch (e) {
    error(e.message);
    return res.json({ ok: false, error: e.message }, e.code && e.code >= 400 && e.code < 600 ? e.code : 500);
  }
};
