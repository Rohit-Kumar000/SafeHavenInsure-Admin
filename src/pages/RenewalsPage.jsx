import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, AlertTriangle, XCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import StatCard from "../components/common/StatCard";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import Field from "../components/common/Field";
import FilterChips from "../components/common/FilterChips";
import { SearchBox, ViewToggle, EmptyState } from "../components/common/Toolbar";
import PageHeader from "../components/common/PageHeader";
import PremiumBreakdown from "../components/common/PremiumBreakdown";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost } from "../components/common/ui";
import { NCB_SLABS, addDays, calcPremium, daysBetween, fmtDate, inr, nextNcb, policyEnd, todayISO } from "../utils/helpers";

const MODES = ["UPI", "Card", "Net Banking", "Cash"];

function RenewDialog({ policy, onClose }) {
  const { vehicles, plans, claims, settings, issuePolicy, updatePolicy } = useData();
  const today = todayISO();

  const vehicle = vehicles.find((v) => v.id === policy.vehicleId);
  const plan = plans.find((p) => p.id === policy.planId) ?? plans.find((p) => p.name === policy.plan);
  const addons = (policy.addons || []).map((n) => plans.find((p) => p.name === n && p.kind === "Add-on")).filter(Boolean);
  const hadClaim = claims.some((c) => c.policyId === policy.id && c.status !== "Rejected");
  const start = policy.status === "Active" ? addDays(policy.endDate, 1) : today;

  const [idv, setIdv] = useState(policy.idv ? String(Math.round((policy.idv * 0.9) / 100) * 100) : "");
  const [ncb, setNcb] = useState(String(hadClaim ? 0 : nextNcb(policy.ncb || 0)));
  const [payStatus, setPayStatus] = useState("Paid");
  const [payMode, setPayMode] = useState("UPI");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  if (!plan || !plan.active || !vehicle) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-slate-300">
          {!vehicle
            ? "The vehicle of this policy no longer exists."
            : `The plan "${policy.plan}" is ${plan ? "disabled" : "no longer available"}. Enable it on the Policy Plans page, or issue a new policy with a different plan.`}
        </p>
        <div className="flex justify-end"><button onClick={onClose} className={btnGhost}>Close</button></div>
      </div>
    );
  }

  const calc = calcPremium({ plan, addons, vehicleType: vehicle.type, idv, ncb, settings });

  const submit = () => {
    if (plan.includesOD) {
      const n = Number(idv);
      if (!Number.isFinite(n) || n < 10000 || n > 50000000) {
        setError("Enter an IDV between ₹10,000 and ₹5,00,00,000");
        return;
      }
    }
    const np = issuePolicy(
      {
        customerId: policy.customerId,
        vehicleId: policy.vehicleId,
        planId: plan.id,
        plan: plan.name,
        addons: addons.map((a) => a.name),
        idv: plan.includesOD ? Number(idv) : null,
        ncb: plan.includesOD ? Number(ncb) : 0,
        netPremium: calc.net,
        gst: calc.gst,
        premium: calc.total,
        startDate: start,
        endDate: policyEnd(start),
        status: "Active",
        issuedOn: today,
        renewedFrom: policy.id,
      },
      { mode: payStatus === "Paid" ? payMode : "", status: payStatus }
    );
    updatePolicy(policy.id, { renewedBy: np.id });
    setDone(np);
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Policy <span className="font-semibold text-gray-900 dark:text-white">{done.id}</span> created for {fmtDate(done.startDate)} to {fmtDate(done.endDate)}.
          Premium {inr(done.premium)}.
        </p>
        <button onClick={onClose} className={btnPrimary}>Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
        <p><span className="font-semibold text-gray-900 dark:text-white">{policy.id}</span> · {policy.plan} · {vehicle.regNo}</p>
        <p className="text-xs">Current policy ends {fmtDate(policy.endDate)}. New period: {fmtDate(start)} to {fmtDate(policyEnd(start))}.</p>
      </div>

      {plan.includesOD && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="New IDV" hint={policy.idv ? "Suggested: 10% lower than last year" : "Current market value of the vehicle"}>
            <input value={idv} onChange={(e) => setIdv(e.target.value.replace(/\D/g, "").slice(0, 8))} className={inputCls} />
          </Field>
          <Field label="No Claim Bonus" hint={hadClaim ? "A claim was made in the last term, so NCB resets" : "No claim made, so NCB moves to the next slab"}>
            <select value={ncb} onChange={(e) => setNcb(e.target.value)} className={inputCls}>
              {NCB_SLABS.map((n) => <option key={n} value={n}>{n}%</option>)}
            </select>
          </Field>
        </div>
      )}
      {addons.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-slate-400">Add-ons carried over: {addons.map((a) => a.name).join(", ")}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Payment">
          <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)} className={inputCls}>
            <option value="Paid">Paid now</option>
            <option value="Pending">Pay later</option>
          </select>
        </Field>
        {payStatus === "Paid" && (
          <Field label="Payment Mode">
            <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={inputCls}>
              {MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
        )}
      </div>

      <PremiumBreakdown calc={calc} />
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={submit} className={btnPrimary}>Renew Policy</button>
      </div>
    </div>
  );
}

function RenewalsPage() {
  const { customers, vehicles, policies } = useData();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [filter, setFilter] = useState("30");
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState(q);
  const [renewId, setRenewId] = useState(null);
  const today = todayISO();

  // Not yet renewed, in force or recently lapsed (up to 90 days), expiring within 60 days
  const rows = useMemo(
    () =>
      policies
        .filter((p) => !p.renewedBy && (p.status === "Active" || p.status === "Expired"))
        .map((p) => {
          const v = vehicles.find((x) => x.id === p.vehicleId);
          return {
            ...p,
            daysLeft: daysBetween(today, p.endDate),
            customer: customers.find((c) => c.id === p.customerId)?.name ?? "Unknown",
            regNo: v?.regNo ?? "-",
            vehicleName: v ? `${v.make} ${v.model}` : "-",
            expiry: fmtDate(p.endDate),
          };
        })
        .filter((r) => r.daysLeft <= 60 && r.daysLeft >= -90)
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [policies, vehicles, customers, today]
  );

  const groups = {
    "30": (r) => r.daysLeft >= 0 && r.daysLeft <= 30,
    "60": (r) => r.daysLeft > 30,
    Expired: (r) => r.daysLeft < 0,
    All: () => true,
  };
  const shown = rows.filter(groups[filter]).filter((r) => {
    const t = query.trim().toLowerCase();
    return !t || [r.id, r.customer, r.regNo, r.plan, r.vehicleName].some((x) => String(x).toLowerCase().includes(t));
  });
  const renewedCount = policies.filter((p) => p.renewedBy).length;
  const renewTarget = renewId ? policies.find((p) => p.id === renewId) : null;

  const columns = [
    { key: "id", label: "Policy No.", render: (r) => <span className="font-mono text-xs font-bold">{r.id}</span> },
    {
      key: "customer",
      label: "Customer",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{r.customer}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{r.regNo} · {r.vehicleName}</p>
        </div>
      ),
    },
    { key: "plan", label: "Plan" },
    { key: "expiry", label: "Expiry Date" },
    {
      key: "daysLeft",
      label: "Time Left",
      render: (r) => (
        <span
          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
            r.daysLeft < 0 || r.daysLeft <= 7
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
              : r.daysLeft <= 30
              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
              : "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400"
          }`}
        >
          {r.daysLeft < 0 ? `Expired ${-r.daysLeft} days ago` : r.daysLeft === 0 ? "Expires today" : `${r.daysLeft} days left`}
        </span>
      ),
    },
    { key: "premium", label: "Last Premium", render: (r) => inr(r.premium) },
    {
      key: "actions",
      label: "Action",
      render: (r) => (
        user.canWrite ? (
          <button onClick={() => setRenewId(r.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <RefreshCw className="h-3.5 w-3.5" /> Renew
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Renewals" subtitle="Policies expiring soon or lapsed in the last 90 days." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Due in 7 Days" value={rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 7).length} icon={AlertTriangle} color="red" note="Needs urgent action" />
        <StatCard title="Due in 30 Days" value={rows.filter(groups["30"]).length} icon={CalendarClock} color="amber" note="Including today" />
        <StatCard title="Expired, Not Renewed" value={rows.filter(groups.Expired).length} icon={XCircle} color="purple" note="Lapsed in last 90 days" />
        <StatCard title="Renewed" value={renewedCount} icon={RefreshCw} color="green" note="Policies renewed so far" />
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "30", label: "Due in 30 days", count: rows.filter(groups["30"]).length },
          { value: "60", label: "31 to 60 days", count: rows.filter(groups["60"]).length },
          { value: "Expired", label: "Expired", count: rows.filter(groups.Expired).length },
          { value: "All", label: "All", count: rows.length },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Search policy, customer, reg. no." />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing to renew here" text="No policies match this filter. Good job staying on top of renewals." />
      ) : view === "list" ? (
        <DataTable key={filter + query} columns={columns} data={shown} pageSize={8} searchable={false} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((r) => {
            const urgent = r.daysLeft <= 7;
            const soon = r.daysLeft <= 30;
            const tone = urgent ? "#e11d48" : soon ? "#d97706" : "#2563EB";
            const pct = Math.max(0, Math.min(1, (60 - Math.max(r.daysLeft, 0)) / 60));
            const C = 2 * Math.PI * 28;
            return (
              <div key={r.id} className="animate-fade-up relative flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-gold-500/40">
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: tone }} />
                <div className="relative ml-1 h-[4.5rem] w-[4.5rem] shrink-0">
                  <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                    <circle cx="36" cy="36" r="28" fill="none" strokeWidth="6" className="stroke-gray-100 dark:stroke-slate-800" />
                    <circle cx="36" cy="36" r="28" fill="none" strokeWidth="6" strokeLinecap="round" stroke={tone} strokeDasharray={C} strokeDashoffset={C * (1 - (r.daysLeft < 0 ? 1 : pct))} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className="font-display text-lg font-bold text-gray-900 dark:text-white">{Math.abs(r.daysLeft)}</span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase text-gray-400">{r.daysLeft < 0 ? "days ago" : "days"}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{r.customer}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">{r.regNo} · {r.vehicleName}</p>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400"><span className="font-mono font-bold text-blue-800 dark:text-gold-300">{r.id}</span> · {r.plan}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: tone }}>{r.daysLeft < 0 ? "Expired" : "Expires"} {r.expiry} · {inr(r.premium)}</p>
                </div>
                {user.canWrite && (
                  <button onClick={() => setRenewId(r.id)} className={`${btnPrimary} shrink-0 px-3.5 py-2 text-xs`}>
                    <RefreshCw className="h-3.5 w-3.5" /> Renew
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!renewTarget} onClose={() => setRenewId(null)} title="Renew Policy" size="lg">
        {renewTarget && <RenewDialog key={renewTarget.id} policy={renewTarget} onClose={() => setRenewId(null)} />}
      </Modal>
    </div>
  );
}

export default RenewalsPage;