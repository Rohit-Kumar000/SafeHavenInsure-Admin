import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Hourglass, BadgeCheck, XCircle, Plus, Eye, Trash2 } from "lucide-react";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import Confirm from "../components/common/Confirm";
import Field from "../components/common/Field";
import Info from "../components/common/Info";
import FilterChips from "../components/common/FilterChips";
import { ViewToggle, EmptyState } from "../components/common/Toolbar";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost, iconAction } from "../components/common/ui";
import { fmtDate, inr, todayISO } from "../utils/helpers";

const FILTERS = ["All", "Registered", "Under Review", "Approved", "Rejected", "Settled"];
const OD_TYPES = ["Accident", "Theft", "Damage", "Fire", "Natural Calamity"];

function claimTypesFor(plan) {
  if (!plan) return [...OD_TYPES, "Third Party Liability"];
  const t = [];
  if (plan.includesOD) t.push(...OD_TYPES);
  if (plan.includesTP) t.push("Third Party Liability");
  return t;
}

const approvedOf = (c) => (c.status === "Approved" || c.status === "Settled" ? c.approvedAmount ?? c.amount : 0);

function ClaimForm({ policies, customers, vehicles, plans, claims, onSave, onCancel }) {
  const [form, setForm] = useState({ policyId: "", type: "", incidentDate: "", amount: "", description: "" });
  const [errors, setErrors] = useState({});
  const today = todayISO();

  const policy = policies.find((p) => p.id === form.policyId);
  const plan = policy && (plans.find((p) => p.id === policy.planId) ?? plans.find((p) => p.name === policy.plan));
  const types = claimTypesFor(plan);

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!policy) err.policyId = "Select a policy";
    if (!form.type || !types.includes(form.type)) err.type = "Select a claim type";
    if (!form.incidentDate) err.incidentDate = "Select the incident date";
    else if (form.incidentDate > today) err.incidentDate = "Incident date cannot be in the future";
    else if (policy && form.incidentDate < policy.startDate) err.incidentDate = "Incident is before the policy started";
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) err.amount = "Enter the claim amount";
    else if (policy?.idv && form.type !== "Third Party Liability" && amt > policy.idv) err.amount = `Amount cannot exceed the IDV (${inr(policy.idv)})`;
    if (form.description.trim().length < 10) err.description = "Describe the incident (at least 10 characters)";
    if (
      policy && !err.type && !err.incidentDate &&
      claims.some((c) => c.policyId === policy.id && c.type === form.type && c.incidentDate === form.incidentDate && c.status !== "Rejected")
    ) {
      err.policyId = "A claim for this incident is already registered";
    }
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({
      policyId: policy.id,
      customerId: policy.customerId,
      type: form.type,
      amount: amt,
      incidentDate: form.incidentDate,
      description: form.description.trim(),
    });
  };

  if (policies.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-slate-300">There are no active policies. A claim can only be registered against an active policy.</p>
        <div className="flex justify-end"><button onClick={onCancel} className={btnGhost}>Close</button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Policy" error={errors.policyId}>
        <select value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value, type: "" })} className={inputCls}>
          <option value="">Select active policy</option>
          {policies.map((p) => {
            const c = customers.find((x) => x.id === p.customerId);
            const v = vehicles.find((x) => x.id === p.vehicleId);
            return <option key={p.id} value={p.id}>{p.id} · {c?.name} · {v?.regNo} · {p.plan}</option>;
          })}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Claim Type" error={errors.type}>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} disabled={!policy} className={inputCls}>
            <option value="">{policy ? "Select type" : "Select a policy first"}</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Incident Date" error={errors.incidentDate}>
          <input type="date" min={policy?.startDate} max={today} value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Claim Amount (₹)" error={errors.amount} hint={policy?.idv ? `Policy IDV: ${inr(policy.idv)}` : undefined}>
        <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "").slice(0, 9) })} placeholder="e.g. 25000" className={inputCls} />
      </Field>
      <Field label="Incident Description" error={errors.description}>
        <textarea rows={3} maxLength={1500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        <button type="submit" className={btnPrimary}>Register Claim</button>
      </div>
    </form>
  );
}

function ClaimsPage() {
  const { customers, vehicles, policies, plans, claims, addClaim, updateClaim, deleteClaim } = useData();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const [filter, setFilter] = useState("All");
  const [view, setView] = useState("grid"); // grid = kanban board
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [action, setAction] = useState(null); // { type, id }
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [deleting, setDeleting] = useState(null);
  const today = todayISO();

  const rows = useMemo(
    () =>
      [...claims]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map((c) => {
          const pol = policies.find((p) => p.id === c.policyId);
          const v = vehicles.find((x) => x.id === pol?.vehicleId);
          return {
            ...c,
            customer: customers.find((x) => x.id === c.customerId)?.name ?? "Unknown",
            regNo: v?.regNo ?? "-",
            dateLabel: fmtDate(c.date),
          };
        }),
    [claims, policies, vehicles, customers]
  );

  const shown = filter === "All" ? rows : rows.filter((r) => r.status === filter);
  const count = (s) => (s === "All" ? rows.length : rows.filter((r) => r.status === s).length);
  const open = rows.filter((r) => r.status === "Registered" || r.status === "Under Review").length;
  const approvedTotal = rows.reduce((s, r) => s + approvedOf(r), 0);

  const sel = viewId ? rows.find((r) => r.id === viewId) : null;
  const selPolicy = sel && policies.find((p) => p.id === sel.policyId);
  const activePolicies = policies.filter((p) => p.status === "Active");
  const actionClaim = action ? claims.find((c) => c.id === action.id) : null;

  const advance = (claim, status, extra, note) =>
    updateClaim(claim.id, {
      status,
      ...extra,
      history: [...(claim.history || [{ status: claim.status, date: claim.date, note: "" }]), { status, date: today, note }],
    });

  const openAction = (type, claim) => {
    setAction({ type, id: claim.id });
    setAmount(String(claim.amount));
    setRemarks("");
    setActionErr("");
  };

  const runAction = () => {
    const c = actionClaim;
    if (action.type === "review") advance(c, "Under Review", {}, remarks.trim() || "Review started");
    if (action.type === "approve") {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0 || n > c.amount) {
        setActionErr(`Enter an amount between 1 and ${c.amount}`);
        return;
      }
      advance(c, "Approved", { approvedAmount: n, remarks: remarks.trim() }, remarks.trim() || `Approved ${inr(n)}`);
    }
    if (action.type === "reject") {
      if (remarks.trim().length < 5) {
        setActionErr("Please give a reason (at least 5 characters)");
        return;
      }
      advance(c, "Rejected", { remarks: remarks.trim() }, remarks.trim());
    }
    if (action.type === "settle") advance(c, "Settled", { settledOn: today }, remarks.trim() || "Settlement paid");
    setAction(null);
  };

  const columns = [
    { key: "id", label: "Claim No.", render: (r) => <span className="font-mono text-xs font-bold">{r.id}</span> },
    {
      key: "customer",
      label: "Customer",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{r.customer}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{r.policyId} · {r.regNo}</p>
        </div>
      ),
    },
    { key: "type", label: "Type" },
    { key: "amount", label: "Claimed", render: (r) => inr(r.amount) },
    { key: "dateLabel", label: "Registered" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex">
          <button onClick={() => setViewId(r.id)} title="View" className={iconAction}><Eye className="h-4 w-4" /></button>
          {r.status === "Registered" && (
            user.canDelete && (<button onClick={() => setDeleting(r)} title="Delete" className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>)
          )}
        </div>
      ),
    },
  ];

  const timeline = sel ? sel.history || [{ status: sel.status, date: sel.date, note: "" }] : [];
  const titles = { review: "Start Review", approve: "Approve Claim", reject: "Reject Claim", settle: "Mark as Settled" };

  return (
    <div className="space-y-6">
      <PageHeader title="Claims" subtitle="Register claims and move them from review to settlement.">
        {user.canWrite && <button onClick={() => setFormOpen(true)} className={btnPrimary}><Plus className="h-4 w-4" /> Register Claim</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Claims" value={rows.length} icon={ClipboardList} color="blue" note="All time" />
        <StatCard title="Open Claims" value={open} icon={Hourglass} color="amber" note="Registered + Under Review" />
        <StatCard title="Approved Amount" value={inr(approvedTotal)} icon={BadgeCheck} color="green" note="Approved and settled" />
        <StatCard title="Rejected" value={count("Rejected")} icon={XCircle} color="red" note="Claims declined" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {view === "list" ? <FilterChips value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f, count: count(f) }))} /> : <p className="text-sm text-gray-500 dark:text-slate-400">Tap a claim to review, approve or settle it.</p>}
        <ViewToggle value={view} onChange={setView} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No claims yet" text="Register a claim against an active policy to start tracking it here." action={<button onClick={() => setFormOpen(true)} className={btnPrimary}><Plus className="h-4 w-4" /> Register Claim</button>} />
      ) : view === "list" ? (
        <DataTable key={q} initialQuery={q} columns={columns} data={shown} pageSize={6} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[72rem] grid-cols-5 gap-4">
            {[
              ["Registered", "bg-blue-500"],
              ["Under Review", "bg-amber-500"],
              ["Approved", "bg-emerald-500"],
              ["Settled", "bg-teal-600"],
              ["Rejected", "bg-red-500"],
            ].map(([stage, dot]) => {
              const items = rows.filter((r) => r.status === stage);
              const total = items.reduce((sum, r) => sum + (r.amount || 0), 0);
              return (
                <div key={stage} className="flex flex-col rounded-2xl bg-gray-200/50 p-3 dark:bg-slate-900/70">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{stage}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">{items.length}</span>
                  </div>
                  <p className="mb-3 px-1 text-xs text-gray-500 dark:text-slate-400">{inr(total)} claimed</p>
                  <div className="space-y-3">
                    {items.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">Nothing here</p>}
                    {items.map((r) => (
                      <button key={r.id} onClick={() => setViewId(r.id)} className="animate-fade-up w-full rounded-xl border border-transparent bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-lg dark:bg-slate-800 dark:hover:border-gold-500/50">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-800 dark:text-gold-300">{r.id}</span>
                          <span className="text-[11px] text-gray-400 dark:text-slate-500">{fmtDate(r.date)}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white">{r.customer}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400">{r.type} · {r.regNo}</p>
                        <p className="mt-2 font-display text-lg font-bold text-gray-900 dark:text-white">{inr(r.amount)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Register New Claim" size="lg">
        <ClaimForm
          policies={activePolicies}
          customers={customers}
          vehicles={vehicles}
          plans={plans}
          claims={claims}
          onCancel={() => setFormOpen(false)}
          onSave={(data) => {
            addClaim({ ...data, date: today, status: "Registered", history: [{ status: "Registered", date: today, note: "Claim registered" }] });
            setFormOpen(false);
          }}
        />
      </Modal>

      {/* Details */}
      <Modal open={!!sel} onClose={() => setViewId(null)} title={sel ? `Claim ${sel.id}` : ""} size="lg">
        {sel && (
          <div className="space-y-5">
            <StatusBadge status={sel.status} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Customer" value={sel.customer} />
              <Info label="Policy" value={sel.policyId} />
              <Info label="Vehicle" value={sel.regNo} />
              <Info label="Claim type" value={sel.type} />
              <Info label="Claimed amount" value={inr(sel.amount)} />
              <Info label="Approved amount" value={approvedOf(sel) ? inr(approvedOf(sel)) : "-"} />
              <Info label="Incident date" value={fmtDate(sel.incidentDate)} />
              <Info label="Registered on" value={fmtDate(sel.date)} />
              {selPolicy && <Info label="Policy plan" value={selPolicy.plan} />}
            </div>
            {sel.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Description</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{sel.description}</p>
              </div>
            )}
            {sel.remarks && (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-300">Remarks: {sel.remarks}</p>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Progress</p>
              <ol className="space-y-3 border-l-2 border-gray-200 pl-4 dark:border-slate-700">
                {timeline.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{h.status}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{fmtDate(h.date)}{h.note ? ` · ${h.note}` : ""}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-slate-800">
              {user.canWrite && sel.status === "Registered" && <button onClick={() => openAction("review", sel)} className={btnPrimary}>Start Review</button>}
              {user.canWrite && sel.status === "Under Review" && (
                <>
                  <button onClick={() => openAction("reject", sel)} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10">Reject</button>
                  <button onClick={() => openAction("approve", sel)} className={btnPrimary}>Approve</button>
                </>
              )}
              {user.canWrite && sel.status === "Approved" && <button onClick={() => openAction("settle", sel)} className={btnPrimary}>Mark as Settled</button>}
              <button onClick={() => setViewId(null)} className={btnGhost}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Action dialog */}
      <Modal open={!!action && !!actionClaim} onClose={() => setAction(null)} title={action ? titles[action.type] : ""}>
        {action && actionClaim && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {actionClaim.id} · claimed {inr(actionClaim.amount)}
            </p>
            {action.type === "approve" && (
              <Field label="Approved Amount (₹)">
                <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 9))} className={inputCls} />
              </Field>
            )}
            <Field label={action.type === "reject" ? "Reason" : "Remarks (optional)"}>
              <textarea rows={3} maxLength={400} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputCls} />
            </Field>
            {actionErr && <p className="text-xs text-red-500">{actionErr}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setAction(null)} className={btnGhost}>Cancel</button>
              <button onClick={runAction} className={btnPrimary}>Confirm</button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Claim"
        danger
        confirmLabel="Delete"
        message={`Delete claim ${deleting?.id}? This cannot be undone.`}
        onConfirm={() => { deleteClaim(deleting.id); setDeleting(null); }}
      />
    </div>
  );
}

export default ClaimsPage;