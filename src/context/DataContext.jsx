import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { databases, client, config, ID, errMsg } from "../lib/appwrite";
import { fromDoc, toDoc, listAll } from "../lib/store";
import { useAuth } from "./AuthContext";
import { logActivity } from "../lib/activity";
import { useToast } from "./ToastContext";
import { plans as defaultPlans } from "../data/plans";
import { defaultSettings } from "../data/settings";
import { policyStatus, todayISO } from "../utils/helpers";

const DataContext = createContext(null);
const DB = config.databaseId;
const COLS = ["customers", "vehicles", "policies", "claims", "payments", "plans"];

function mergeSettings(s) {
  const d = defaultSettings;
  const x = s || {};
  return {
    ...d,
    ...x,
    tpRates: { ...d.tpRates, ...x.tpRates },
    odRates: { ...d.odRates, ...x.odRates },
    company: { ...d.company, ...x.company },
  };
}

const cacheKey = (uid) => `sh_cache_${uid}`;
const readCache = (uid) => {
  try { return JSON.parse(localStorage.getItem(cacheKey(uid))); } catch { return null; }
};

const CONFIG_COLS = ["plans", "settings"];
const LABEL = { customers: "customer", vehicles: "vehicle", policies: "policy", claims: "claim", payments: "payment", plans: "plan" };
const describe = (col, d = {}) =>
  [d.name, d.regNo, d.plan && `${d.plan}`, d.type, d.amount && `₹${d.amount}`, d.status].filter(Boolean).slice(0, 3).join(" · ");

const nextCode = (prefix, start) => (list) => {
  const max = list.reduce((m, i) => Math.max(m, parseInt(String(i.id).replace(/\D/g, ""), 10) || 0), start - 1);
  return `${prefix}-${max + 1}`;
};
const nextPolicyId = nextCode("POL", 1001);
const nextClaimId = nextCode("CLM", 2001);
const nextPaymentId = nextCode("PAY", 3001);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();

  const [state, setState] = useState({ customers: [], vehicles: [], policies: [], claims: [], payments: [], plans: [] });
  const [rawSettings, setRawSettings] = useState(defaultSettings);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState(0);
  const userRef = useRef(user);
  const ref = useRef(state);

  useEffect(() => { userRef.current = user; }, [user]);
  // Keep the latest state available to asynchronous operations without writing refs during render.
  useEffect(() => { ref.current = state; }, [state]);
  const queue = useRef(Promise.resolve());

  const setList = useCallback((col, fn) => {
    setState((s) => {
      const next = { ...s, [col]: fn(s[col]) };
      ref.current = next;
      return next;
    });
  }, []);

  // Queue Appwrite writes to preserve operation order.
  const run = useCallback(
    (task, rollback, failMsg = "Could not save changes") => {
      setPending((n) => n + 1);
      queue.current = queue.current
        .then(task)
        .catch((e) => {
          rollback?.();
          toast.error(`${failMsg}: ${errMsg(e)}`);
        })
        .finally(() => setPending((n) => n - 1));
    },
    [toast]
  );

  // ---------- initial load ----------
  const load = useCallback(async () => {
    // Show cached data immediately while refreshing it from Appwrite.
    const uid = userRef.current?.id;
    const cached = uid ? readCache(uid) : null;
    if (cached?.state && !ref.current.customers.length && !ref.current.policies.length) {
      ref.current = cached.state;
      setState(cached.state);
      if (cached.settings) setRawSettings(cached.settings);
      setStatus("ready");
    } else {
      setStatus("loading");
    }
    setLoadError("");
    try {
      const [lists, settingsDoc] = await Promise.all([
        Promise.all(COLS.map((c) => listAll(c))),
        databases.getDocument(DB, "settings", "main").catch((e) => (e.code === 404 ? null : Promise.reject(e))),
      ]);
      const next = Object.fromEntries(COLS.map((c, i) => [c, lists[i]]));

      if (!settingsDoc && !userRef.current?.isSuper) {
        setRawSettings(defaultSettings);
        next.plans = next.plans.length ? next.plans : defaultPlans.map((p) => ({ ...p, id: `plan_${p.id}` }));
      } else if (!settingsDoc) {
        // Initialize configurable default rates and plans when no saved configuration exists.
        const ignore409 = (e) => { if (e.code !== 409) throw e; };
        await databases.createDocument(DB, "settings", "main", { data: JSON.stringify(defaultSettings) }).catch(ignore409);
        const seeded = [];
        for (const p of defaultPlans) {
          const id = `plan_${p.id}`;
          const body = Object.fromEntries(Object.entries(p).filter(([key]) => key !== "id"));
          await databases.createDocument(DB, "plans", id, toDoc("plans", body)).catch(ignore409);
          seeded.push({ ...p, id });
        }
        next.plans = seeded;
        setRawSettings(defaultSettings);
      } else {
        try { setRawSettings(JSON.parse(settingsDoc.data)); } catch { setRawSettings(defaultSettings); }
      }

      ref.current = next;
      setState(next);
      setStatus("ready");
    } catch (e) {
      setLoadError(errMsg(e, "Could not load data"));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (user?.hasAccess) {
      const task = Promise.resolve().then(load);
      return () => { void task; };
    }
    const empty = { customers: [], vehicles: [], policies: [], claims: [], payments: [], plans: [] };
    const reset = () => {
      ref.current = empty;
      setState(empty);
      setStatus("idle");
    };
    const task = Promise.resolve().then(reset);
    return () => { void task; };
  }, [user?.id, user?.hasAccess, load]);

  // Debounce cache writes to avoid saving on every small state change.
  useEffect(() => {
    if (status !== "ready" || !user?.id) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(cacheKey(user.id), JSON.stringify({ state, settings: rawSettings })); } catch { /* storage full */ }
    }, 800);
    return () => clearTimeout(t);
  }, [state, rawSettings, status, user?.id]);

  // ---------- Realtime updates from other admins and devices ----------
  useEffect(() => {
    if (status !== "ready") return;
    let unsub;
    try {
      const channels = COLS.map((c) => `databases.${DB}.collections.${c}.documents`);
      unsub = client.subscribe(channels, (msg) => {
        const col = COLS.find((c) => msg.channels.some((ch) => ch.includes(`collections.${c}.documents`)));
        if (!col) return;
        const kind = msg.events.find((e) => /\.(create|update|delete)$/.test(e))?.split(".").pop();
        const doc = fromDoc(col, msg.payload);
        if (kind === "delete") setList(col, (l) => l.filter((i) => i.id !== doc.id));
        else setList(col, (l) => (l.some((i) => i.id === doc.id) ? l.map((i) => (i.id === doc.id ? { ...i, ...doc } : i)) : [...l, doc]));
      });
    } catch {
      /* realtime updates are optional */
    }
    return () => { try { unsub?.(); } catch { /* ignore */ } };
  }, [status, setList]);

  // ---------- generic add / update / remove ----------
  const allowed = useCallback(
    (col, kind) => {
      const ok = kind === "delete" ? user?.canDelete : CONFIG_COLS.includes(col) ? user?.canConfigure : user?.canWrite;
      if (!ok) toast.error("You do not have permission to do this");
      return !!ok;
    },
    [user, toast]
  );

  const add = useCallback(
    (col, data, id) => {
      const item = { ...data, id };
      if (!allowed(col, "create")) return item;
      logActivity(user, "create", LABEL[col], id, describe(col, data));
      setList(col, (l) => [...l, item]);
      run(
        () => databases.createDocument(DB, col, id, toDoc(col, data)),
        () => setList(col, (l) => l.filter((i) => i.id !== id))
      );
      return item;
    },
    [run, setList, allowed, user]
  );

  const update = useCallback(
    (col, id, patch) => {
      if (!allowed(col, "update")) return;
      logActivity(user, "update", LABEL[col], id, describe(col, { ...ref.current[col].find((i) => i.id === id), ...patch }));
      const before = ref.current[col].find((i) => i.id === id);
      setList(col, (l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      run(
        () => databases.updateDocument(DB, col, id, toDoc(col, patch)),
        () => before && setList(col, (l) => l.map((i) => (i.id === id ? before : i)))
      );
    },
    [run, setList, allowed, user]
  );

  const remove = useCallback(
    (col, ids) => {
      const list = Array.isArray(ids) ? ids : [ids];
      if (!list.length) return;
      if (!allowed(col, "delete")) return;
      list.forEach((id) => logActivity(user, "delete", LABEL[col], id, describe(col, ref.current[col].find((i) => i.id === id))));
      const removed = ref.current[col].filter((i) => list.includes(i.id));
      setList(col, (l) => l.filter((i) => !list.includes(i.id)));
      for (const id of list) {
        run(
          () => databases.deleteDocument(DB, col, id).catch((e) => { if (e.code !== 404) throw e; }),
          () => setList(col, (l) => (l.some((i) => i.id === id) ? l : [...l, removed.find((r) => r.id === id)].filter(Boolean))),
          "Could not delete"
        );
      }
    },
    [run, setList, allowed, user]
  );

  const policies = useMemo(() => state.policies.map((p) => ({ ...p, status: policyStatus(p) })), [state.policies]);
  const settings = useMemo(() => mergeSettings(rawSettings), [rawSettings]);

  const { customers, vehicles, claims, payments, plans } = state;
  const rawPolicies = state.policies;

  // ---------- customers ----------
  const getCustomerImpact = (id) => ({
    vehicles: vehicles.filter((x) => x.customerId === id).length,
    policies: rawPolicies.filter((x) => x.customerId === id).length,
    claims: claims.filter((x) => x.customerId === id).length,
    payments: payments.filter((x) => x.customerId === id).length,
  });

  const deleteCustomer = (id) => {
    remove("payments", payments.filter((x) => x.customerId === id).map((x) => x.id));
    remove("claims", claims.filter((x) => x.customerId === id).map((x) => x.id));
    remove("policies", rawPolicies.filter((x) => x.customerId === id).map((x) => x.id));
    remove("vehicles", vehicles.filter((x) => x.customerId === id).map((x) => x.id));
    remove("customers", id);
  };

  // ---------- vehicles ----------
  const policyIdsOfVehicle = (id) => rawPolicies.filter((x) => x.vehicleId === id).map((x) => x.id);

  const getVehicleImpact = (id) => {
    const ids = policyIdsOfVehicle(id);
    return {
      policies: ids.length,
      claims: claims.filter((x) => ids.includes(x.policyId)).length,
      payments: payments.filter((x) => ids.includes(x.policyId)).length,
    };
  };

  const deleteVehicle = (id) => {
    const ids = policyIdsOfVehicle(id);
    remove("payments", payments.filter((x) => ids.includes(x.policyId)).map((x) => x.id));
    remove("claims", claims.filter((x) => ids.includes(x.policyId)).map((x) => x.id));
    remove("policies", ids);
    remove("vehicles", id);
  };

  // ---------- policy + its payment together ----------
  const issuePolicy = (policyData, paymentData) => {
    const policy = add("policies", policyData, nextPolicyId(ref.current.policies));
    add(
      "payments",
      { policyId: policy.id, customerId: policy.customerId, amount: policy.premium, date: todayISO(), ...paymentData },
      nextPaymentId(ref.current.payments)
    );
    return policy;
  };

  // ---------- settings ----------
  const updateSettings = (patch) => {
    if (!allowed("settings", "update")) return;
    logActivity(user, "update", "settings", "main", "Changed company or rate settings");
    const merged = mergeSettings({ ...rawSettings, ...patch });
    const before = rawSettings;
    setRawSettings(merged);
    run(
      () =>
        databases
          .updateDocument(DB, "settings", "main", { data: JSON.stringify(merged) })
          .catch((e) => (e.code === 404 ? databases.createDocument(DB, "settings", "main", { data: JSON.stringify(merged) }) : Promise.reject(e))),
      () => setRawSettings(before)
    );
  };

  // ---------- data management ----------
  const clearAll = () => {
    if (!allowed("customers", "delete")) return;
    for (const col of ["payments", "claims", "policies", "vehicles", "customers"]) remove(col, ref.current[col].map((i) => i.id));
  };

  const exportData = () => ({
    exportedAt: new Date().toISOString(),
    customers, vehicles, policies: rawPolicies, claims, payments, plans, settings,
  });

  const value = {
    customers, vehicles, policies, claims, payments, plans, settings,
    loading: status === "loading" || status === "idle",
    syncing: pending > 0,
    reload: load,

    addCustomer: (d) => add("customers", d, ID.unique()),
    updateCustomer: (id, d) => update("customers", id, d),
    deleteCustomer,
    getCustomerImpact,

    addVehicle: (d) => add("vehicles", d, ID.unique()),
    updateVehicle: (id, d) => update("vehicles", id, d),
    deleteVehicle,
    getVehicleImpact,

    issuePolicy,
    updatePolicy: (id, d) => update("policies", id, d),

    addClaim: (d) => add("claims", d, nextClaimId(ref.current.claims)),
    updateClaim: (id, d) => update("claims", id, d),
    deleteClaim: (id) => remove("claims", id),

    addPayment: (d) => add("payments", d, nextPaymentId(ref.current.payments)),
    updatePayment: (id, d) => update("payments", id, d),
    deletePayment: (id) => remove("payments", id),

    addPlan: (d) => add("plans", d, ID.unique()),
    updatePlan: (id, d) => update("plans", id, d),
    deletePlan: (id) => remove("plans", id),

    updateSettings,
    clearAll,
    exportData,
  };

  if (user?.hasAccess && status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-100 p-6 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-500/30 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Could not load your data</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{loadError}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Check that you ran <code>npm run setup:appwrite</code> and that your user has the label &quot;admin&quot;.
          </p>
          <button onClick={() => load()} className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
