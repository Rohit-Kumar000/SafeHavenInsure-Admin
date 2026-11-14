import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, ShieldCheck, CalendarClock, IndianRupee, Eye, Printer, Plus, Ban } from "lucide-react";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import Confirm from "../components/common/Confirm";
import Info from "../components/common/Info";
import FilterChips from "../components/common/FilterChips";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost, iconAction } from "../components/common/ui";
import { daysBetween, fmtDate, inr, todayISO } from "../utils/helpers";
import { certificateHtml, printDocument } from "../utils/documents";

const FILTERS = ["All", "Active", "Upcoming", "Expired", "Cancelled"];

function PoliciesPage() {
  const { customers, vehicles, policies, plans, claims, payments, settings, updatePolicy, updatePayment } = useData();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const [filter, setFilter] = useState("All");
  const [viewId, setViewId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [reason, setReason] = useState("");
  const [cancelErr, setCancelErr] = useState("");
  const today = todayISO();

  const rows = useMemo(
    () =>
      [...policies]
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((p) => {
          const v = vehicles.find((x) => x.id === p.vehicleId);
          return {
            ...p,
            customer: customers.find((c) => c.id === p.customerId)?.name ?? "Unknown",
            regNo: v?.regNo ?? "-",
            vehicleName: v ? `${v.make} ${v.model}` : "-",
            period: `${fmtDate(p.startDate)} - ${fmtDate(p.endDate)}`,
          };
        }),
    [policies, vehicles, customers]
  );

  const shown = filter === "All" ? rows : rows.filter((r) => r.status === filter);
  const count = (s) => (s === "All" ? rows.length : rows.filter((r) => r.status === s).length);

  const expiring = rows.filter((r) => r.status === "Active" && !r.renewedBy && daysBetween(today, r.endDate) <= 30).length;
  const premiumTotal = rows.filter((r) => r.status !== "Cancelled").reduce((s, r) => s + r.premium, 0);

  const sel = viewId ? rows.find((r) => r.id === viewId) : null;
  const selCustomer = sel && customers.find((c) => c.id === sel.customerId);
  const selVehicle = sel && vehicles.find((v) => v.id === sel.vehicleId);
  const selPayments = sel ? payments.filter((p) => p.policyId === sel.id) : [];

  const print = (r) => {
    const c = customers.find((x) => x.id === r.customerId);
    const v = vehicles.find((x) => x.id === r.vehicleId);
    const pl = plans.find((p) => p.id === r.planId) ?? plans.find((p) => p.name === r.plan);
    printDocument(`Policy ${r.id}`, certificateHtml({ policy: r, customer: c, vehicle: v, plan: pl, company: settings.company }));
  };

  const openCancel = () => {
    setCancelId(viewId);
    setReason("");
    setCancelErr("");
  };

  const confirmCancel = () => {
    const open = claims.filter((c) => c.policyId === cancelId && ["Registered", "Under Review", "Approved"].includes(c.status));
    if (open.length) {
      setCancelErr(`This policy has ${open.length} open claim(s). Close them before cancelling.`);
      return;
    }
    if (reason.trim().length < 5) {
      setCancelErr("Please enter a reason (at least 5 characters)");
      return;
    }
    updatePolicy(cancelId, { status: "Cancelled", cancelledOn: today, cancelReason: reason.trim() });
    payments.filter((p) => p.policyId === cancelId && p.status === "Pending").forEach((p) => updatePayment(p.id, { status: "Cancelled" }));
    setCancelId(null);
  };

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
    { key: "period", label: "Period" },
    { key: "premium", label: "Premium", render: (r) => inr(r.premium) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex">
          <button onClick={() => setViewId(r.id)} title="View" className={iconAction}><Eye className="h-4 w-4" /></button>
          {r.status !== "Cancelled" && (
            <button onClick={() => print(r)} title="Print certificate" className={iconAction}><Printer className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Policies" subtitle="All policies issued, with certificate and cancellation.">
        {user.canWrite && <Link to="/policies/new" className={btnPrimary}><Plus className="h-4 w-4" /> New Policy</Link>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Policies" value={rows.length} icon={FileText} color="blue" note="All time" />
        <StatCard title="Active" value={count("Active")} icon={ShieldCheck} color="green" note="Currently in force" />
        <StatCard title="Expiring Soon" value={expiring} icon={CalendarClock} color="amber" note="Within 30 days, not renewed" />
        <StatCard title="Total Premium" value={inr(premiumTotal)} icon={IndianRupee} color="purple" note="Excluding cancelled" />
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f, label: f, count: count(f) }))}
      />

      <DataTable key={q} initialQuery={q} columns={columns} data={shown} pageSize={6} />

      {/* Details */}
      <Modal open={!!sel} onClose={() => setViewId(null)} title={sel ? `Policy ${sel.id}` : ""} size="lg">
        {sel && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={sel.status} />
              <span className="text-xs text-gray-500 dark:text-slate-400">Issued {fmtDate(sel.issuedOn || sel.startDate)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Customer" value={selCustomer?.name} />
              <Info label="Phone" value={selCustomer?.phone} />
              <Info label="KYC" value={selCustomer && <StatusBadge status={selCustomer.kyc} />} />
              <Info label="Vehicle" value={selVehicle ? `${selVehicle.make} ${selVehicle.model}` : "-"} />
              <Info label="Reg. No." value={selVehicle?.regNo} />
              <Info label="Type" value={selVehicle?.type} />
              <Info label="Plan" value={sel.plan} />
              <Info label="Period" value={`${fmtDate(sel.startDate)} to ${fmtDate(sel.endDate)}`} className="col-span-2" />
              {sel.idv ? <Info label="IDV" value={inr(sel.idv)} /> : null}
              {sel.ncb ? <Info label="NCB" value={`${sel.ncb}%`} /> : null}
              <Info label="Add-ons" value={sel.addons?.length ? sel.addons.join(", ") : "None"} className="col-span-2 sm:col-span-1" />
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">
              {sel.netPremium != null && (
                <div className="mb-2 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                  <div className="flex justify-between"><span>Net premium</span><span>{inr(sel.netPremium)}</span></div>
                  <div className="flex justify-between"><span>GST</span><span>{inr(sel.gst)}</span></div>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Total premium</span><span>{inr(sel.premium)}</span>
              </div>
            </div>

            {selPayments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Payments</p>
                <div className="space-y-1.5">
                  {selPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-300">{p.id} · {inr(p.amount)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sel.renewedFrom && <p className="text-xs text-gray-500 dark:text-slate-400">Renewal of policy {sel.renewedFrom}</p>}
            {sel.renewedBy && <p className="text-xs text-gray-500 dark:text-slate-400">Renewed as policy {sel.renewedBy}</p>}
            {sel.status === "Cancelled" && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                Cancelled on {fmtDate(sel.cancelledOn)}{sel.cancelReason ? `: ${sel.cancelReason}` : ""}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-slate-800">
              {user.canWrite && (sel.status === "Active" || sel.status === "Upcoming") && (
                <button onClick={openCancel} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10">
                  <Ban className="h-4 w-4" /> Cancel Policy
                </button>
              )}
              {sel.status !== "Cancelled" && (
                <button onClick={() => print(sel)} className={btnGhost}><Printer className="h-4 w-4" /> Print Certificate</button>
              )}
              <button onClick={() => setViewId(null)} className={btnPrimary}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel */}
      <Confirm
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel Policy"
        danger
        confirmLabel="Cancel Policy"
        onConfirm={confirmCancel}
        message={`Policy ${cancelId} will be marked as cancelled. Pending payments for it will be cancelled too. This cannot be undone.`}
      >
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation" className={inputCls} />
        {cancelErr && <p className="text-xs text-red-500">{cancelErr}</p>}
      </Confirm>
    </div>
  );
}

export default PoliciesPage;