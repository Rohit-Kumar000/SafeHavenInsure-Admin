import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { account, storage, config, ID, errMsg, isConfigured, roleOf, permsFor, ROLE_NAME, callStaff } from "../lib/appwrite";
import { logActivity } from "../lib/activity";

const AuthContext = createContext(null);

const COMMON = ["password", "password1", "admin123", "admin@123", "12345678", "123456789", "qwerty123", "welcome123", "abc12345", "letmein123"];

// Returns an error message, or "" if the password is acceptable
export function passwordProblem(pw) {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain both letters and numbers";
  if (COMMON.includes(pw.toLowerCase())) return "This password is too common. Choose a different one";
  return "";
}

const fileUrl = (id) => (id ? String(storage.getFileView(config.bucketId, id)) : null);

function shape(u) {
  const prefs = u.prefs || {};
  const role = roleOf(u.labels);
  return {
    id: u.$id,
    name: u.name || (u.email || "").split("@")[0] || "User",
    email: u.email,
    labels: u.labels || [],
    roleName: ROLE_NAME[role],
    avatarId: prefs.avatarId || null,
    coverId: prefs.coverId || null,
    ...permsFor(role),
  };
}

// "Remember this device" keeps the session only if the app was last open within this window.
const REMEMBER_MS = 10 * 60 * 1000;
const LAST_SEEN = "sh_last_seen";
const rememberExpired = () => {
  if (localStorage.getItem("sh_remember") !== "1" || sessionStorage.getItem("sh_alive")) return false;
  const last = Number(localStorage.getItem(LAST_SEEN) || 0);
  return !last || Date.now() - last > REMEMBER_MS;
};
const stamp = () => { try { localStorage.setItem(LAST_SEEN, String(Date.now())); } catch { /* ignore */ } };

// Keep a small local snapshot so the UI can render quickly after refresh.
const USER_KEY = "sh_user";
const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    // A saved snapshot is not valid when persistent sign-in was disabled.
    if (localStorage.getItem("sh_remember") === "0" && !sessionStorage.getItem("sh_alive")) return null;
    if (rememberExpired()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const writeCachedUser = (u) => {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
};

// Record a "login" activity when a new session starts (email, Google, or GitHub)
async function noteLogin(user) {
  try {
    const s = await account.getSession("current");
    if (localStorage.getItem("sh_last_session") !== s.$id) {
      localStorage.setItem("sh_last_session", s.$id);
      logActivity(user, "login", "session", s.$id, `Logged in via ${s.provider === "email" ? "email" : s.provider}`);
    }
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const cached = useMemo(() => (isConfigured ? readCachedUser() : null), []);
  const [user, setUser] = useState(cached);
  const [loading, setLoading] = useState(isConfigured && !cached);

  const apply = useCallback((u) => {
    const s = shape(u);
    setUser(s);
    writeCachedUser(s);
    return s;
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    writeCachedUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const u = await account.get();
    return apply(u);
  }, [apply]);

  // Verify the session on app startup; use the cached snapshot for an immediate render.
  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    (async () => {
      try {
        if ((localStorage.getItem("sh_remember") === "0" && !sessionStorage.getItem("sh_alive")) || rememberExpired()) {
          await account.deleteSession("current").catch(() => {});
          throw new Error("session ended");
        }
        const u = await account.get();
        sessionStorage.setItem("sh_alive", "1");
        if (!alive) return;
        const s = apply(u);
        noteLogin(s);
      } catch (e) {
        // Keep the cached user during network errors; log out only on a confirmed 401.
        if (alive && (e?.code === 401 || e?.message === "session ended")) clear();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apply, clear]);

  // Refresh the last-seen time while the app is open and when the tab closes.
  useEffect(() => {
    if (!user) return;
    stamp();
    const ping = () => { if (document.visibilityState === "visible") callStaff({ action: "ping" }).catch(() => {}); };
    ping();
    const pinger = setInterval(ping, 60000);
    const timer = setInterval(stamp, 30000);
    window.addEventListener("pagehide", stamp);
    return () => { clearInterval(timer); clearInterval(pinger); window.removeEventListener("pagehide", stamp); };
  }, [user]);

  // Re-check the role when the tab becomes visible again (in case a Super Admin changed the role)
  useEffect(() => {
    if (!user) return;
    const onVisible = () => { if (document.visibilityState === "visible") refresh().catch((e) => { if (e?.code === 401) clear(); }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, refresh, clear]);

  const login = async (email, password, remember = false) => {
    try {
      try { await account.deleteSession("current"); } catch { /* no previous session to remove */ }
      await account.createEmailPasswordSession(email.trim(), password);
      localStorage.setItem("sh_remember", remember ? "1" : "0");
      sessionStorage.setItem("sh_alive", "1");
      stamp();
      const s = await refresh();
      noteLogin(s);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errMsg(e, "Login failed. Please try again.") };
    }
  };

  // Enable Google or GitHub sign-in in the Appwrite Console before using it.
  const loginWithProvider = (provider) => {
    const origin = window.location.origin;
    sessionStorage.setItem("sh_alive", "1");
    localStorage.setItem("sh_remember", "1");
    stamp();
    account.createOAuth2Session(provider, `${origin}/dashboard`, `${origin}/login?oauth=failed`);
  };

  const logout = async () => {
    if (user) {
      // Record the logout before removing the session.
      await Promise.race([Promise.all([logActivity(user, "logout", "session", "", "Logged out"), callStaff({ action: "ping", offline: true }).catch(() => {})]), new Promise((r) => setTimeout(r, 1500))]);
    }
    try { await account.deleteSession("current"); } catch { /* already out */ }
    sessionStorage.removeItem("sh_alive");
    localStorage.removeItem("sh_last_session");
    if (user) localStorage.removeItem(`sh_cache_${user.id}`);
    clear();
  };

  const sendRecovery = async (email) => {
    try {
      await account.createRecovery(email.trim(), `${window.location.origin}/reset-password`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  };

  const completeRecovery = async (userId, secret, password) => {
    try {
      await account.updateRecovery(userId, secret, password);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errMsg(e, "This reset link is invalid or has expired") };
    }
  };

  // Appwrite requires the current password to change an email address.
  const updateProfile = async ({ name, email, password }) => {
    try {
      if (name !== user.name) await account.updateName(name);
      if (email.toLowerCase() !== user.email.toLowerCase()) {
        if (!password) return { ok: false, needPassword: true, error: "Enter your current password to change the email" };
        await account.updateEmail(email, password);
      }
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  };

  const changePassword = async (current, next) => {
    try {
      await account.updatePassword(next, current);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.code === 401 ? "Current password is incorrect" : errMsg(e) };
    }
  };

  // key is "avatar" or "cover"; pass null to remove the image.
  const setMedia = async (key, file) => {
    const idKey = key === "avatar" ? "avatarId" : "coverId";
    try {
      const oldId = user[idKey];
      let newId = null;
      if (file) {
        const created = await storage.createFile(config.bucketId, ID.unique(), file);
        newId = created.$id;
      }
      const prefs = (await account.getPrefs()) || {};
      await account.updatePrefs({ ...prefs, [idKey]: newId });
      if (oldId) storage.deleteFile(config.bucketId, oldId).catch(() => {});
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errMsg(e, "Could not upload the image") };
    }
  };

  const media = useMemo(
    () => ({ avatar: fileUrl(user?.avatarId), cover: fileUrl(user?.coverId) }),
    [user?.avatarId, user?.coverId]
  );

  return (
    <AuthContext.Provider
      value={{
        user, loading, media, setMedia, refreshUser: refresh, login, loginWithProvider, logout,
        sendRecovery, completeRecovery, updateProfile, changePassword,
        oauthProviders: config.oauth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
