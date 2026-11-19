import { useCallback, useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, PlusCircle, Pencil, Trash2, RefreshCw, Activity, Crown, ShieldCheck, User } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import FilterChips from "../components/common/FilterChips";
import { SearchBox, EmptyState } from "../components/common/Toolbar";
import { btnGhost } from "../components/common/ui";
import { useAuth } from "../context/AuthContext";
import { databases, config, Query, ROLE_NAME } from "../lib/appwrite";
import { ACTIVITY_COLLECTIONS } from "../lib/activity";
import { timeAgo, fullTime } from "../lib/time";

const ICON = { login: LogIn, logout: LogOut, create: PlusCircle, update: Pencil, delete: Trash2 };
const TONE = {
  login: "bg-emerald-500", logout: "bg-slate-500", create: "bg-blue-600", update: "bg-amber-500", delete: "bg-red-500",
};
const ROLE_ICON = { superadmin: Crown, admin: ShieldCheck, employee: User };
const VERB = { login: "logged in", logout: "logged out", create: "added", update: "updated", delete: "deleted" };

function ActivityPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("all");
  const [person, setPerson] = useState("all");
  const [query, setQuery] = useState("");

  // Super Admins can view all logs; Admins can view employee logs only.
  // Employees only receive their own entries; Appwrite filters the rest out.
  const cols = useMemo(() => (user.isSuper ? Object.values(ACTIVITY_COLLECTIONS) : user.isAdmin ? [ACTIVITY_COLLECTIONS.employee, ACTIVITY_COLLECTIONS.admin] : [ACTIVITY_COLLECTIONS.employee]), [user.isSuper, user.isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        cols.map((c) => databases.listDocuments(config.databaseId, c, [Query.orderDesc("$createdAt"), Query.limit(500)]))
      );
      const all = results.flatMap((r) => r.documents).sort((a, b) => b.$createdAt.localeCompare(a.$createdAt));
      setItems(all);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cols]);

  useEffect(() => {
    let active = true;
    const start = () => { if (active) void load(); };
    const initial = setTimeout(start, 0);
    const t = setInterval(start, 30000); // Refresh activity data every 30 seconds.
    return () => { active = false; clearTimeout(initial); clearInterval(t); };
  }, [load]);

  const people = useMemo(() => {
    const m = new Map();
    items.forEach((i) => m.set(i.userId, { id: i.userId, name: i.userName, role: i.role }));
    return [...m.values()];
  }, [items]);

  const filtered = items.filter((i) => {
    const t = query.trim().toLowerCase();
    return (action === "all" || i.action === action) && (person === "all" || i.userId === person) && (!t || `${i.userName} ${i.summary} ${i.entity} ${i.entityId}`.toLowerCase().includes(t));
  });

  // Group activity records by day.
  const groups = useMemo(() => {
    const g = new Map();
    filtered.forEach((i) => {
      const d = new Date(i.$createdAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
      if (!g.has(d)) g.set(d, []);
      g.get(d).push(i);
    });
    return [...g.entries()];
  }, [filtered]);

  const stat = (a) => items.filter((i) => i.action === a).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" subtitle={user.isSuper ? "Everything your Admins and Employees do, with login and logout times." : user.isAdmin ? "Your Employees' work and your own." : "Your own work and login history."}>
        <button onClick={load} className={btnGhost}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["login", "Logins"], ["create", "Records added"], ["update", "Records edited"], ["delete", "Records deleted"]].map(([a, label]) => {
          const Icon = ICON[a];
          return (
            <div key={a} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${TONE[a]}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-gray-900 dark:text-white">{stat(a)}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">in the latest 500 entries</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
        <div className="w-full xl:max-w-xs xl:flex-1"><SearchBox value={query} onChange={setQuery} placeholder="Search activity" /></div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <select value={person} onChange={(e) => setPerson(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <option value="all">Everyone</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({ROLE_NAME[p.role]})</option>)}
          </select>
          <FilterChips
            value={action}
            onChange={setAction}
            options={[{ value: "all", label: "All" }, ...["login", "logout", "create", "update", "delete"].map((a) => ({ value: a, label: a[0].toUpperCase() + a.slice(1) }))]}
          />
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      {loading && !items.length ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-slate-800" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" text="Logins and changes made by your team will show up here." />
      ) : (
        groups.map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">{day}</h3>
            <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {list.map((i) => {
                const Icon = ICON[i.action] || Activity;
                const RIcon = ROLE_ICON[i.role] || User;
                return (
                  <li key={i.$id} className="flex items-center gap-4 p-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${TONE[i.action] || "bg-slate-500"}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <b>{i.userName}</b> <span className="text-gray-500 dark:text-slate-400">{VERB[i.action] || i.action}</span>
                        {i.entity && i.entity !== "session" && <> a <b>{i.entity}</b>{i.entityId && <span className="font-mono text-xs text-gray-400"> {String(i.entityId).slice(0, 12)}</span>}</>}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-slate-400">{i.summary}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 sm:flex"><RIcon className="h-3.5 w-3.5" />{ROLE_NAME[i.role]}</div>
                    <time title={fullTime(i.$createdAt)} className="shrink-0 text-xs text-gray-500 dark:text-slate-400">{timeAgo(i.$createdAt)}</time>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

export default ActivityPage;
