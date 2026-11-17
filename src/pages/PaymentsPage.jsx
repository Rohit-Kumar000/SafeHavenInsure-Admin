import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IndianRupee, Clock, XCircle, CalendarDays, Receipt, CheckCircle2, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import Field from "../components/common/Field";
import Info from "../components/common/Info";
import FilterChips from "../components/common/FilterChips";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost, iconAction } from "../components/common/ui";
import { fmtDate, inr, todayISO } from "../utils/helpers";
import { printDocument, receiptHtml } from "../utils/documents";

const FILTERS = ["All", "Paid", "Pending", "Failed", "Cancelled"];
const MODES = ["UPI", "Card", "Net Banking", "Cash"];

function PaymentsPage() {
  const { customers, vehicles, policies, payments, settings, updatePayment } = useData();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const [filter, setFilter] = useState("All");
  const [receiptId, setReceiptId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [mode, setMode] = useState("UPI");
  const today = todayISO();

  const rows = useMemo(
    () =>
      [...payments]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map((p) => ({
          ...p,
          customer: customers.find((c) => c.id === p.customerId)?.name ?? "Unknown",
          modeLabel: p.mode || "-",
          dateLabel: fmtDate(p.date),
        })),
    [payments, customers]
  );

  const shown = filter === "All" ? rows : rows.filter((r) => r.status === filter);
  const count = (s) => (s === "All" ? rows.length : rows.filter((r) => r.status === s).length);
  const sum = (list) => list.reduce((s, r) => s + r.amount, 0);

  const monthKey = today.slice(0, 7);
  const collected = sum(rows.filter((r) => r.status === "Paid"));
  const pendingAmt = sum(rows.filter((r) => r.status === "Pending"));
  const thisMonth = sum(rows.filter((r) => r.status === "Paid" && String(r.date).slice(0, 7) === monthKey));

  // Summarize the last six months of paid collections by payment mode.
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: d.toLocaleString("en-IN", { month: "short" }), v: sum(rows.filter((r) => r.status === "Paid" && String(r.date).slice(0, 7) === key)) };
  });
  const modeTotals = MODES.map((m) => ({ m, v: sum(rows.filter((r) => r.status === "Paid" && r.mode === m)) }));
  const modeSum = modeTotals.reduce((a, b) => a + b.v, 0);
  const modeColor = { UPI: "bg-blue-600", Card: "bg-gold-500", "Net Banking": "bg-emerald-500", Cash: "bg-violet-500" };

  const receipt = receiptId ? rows.find((r) => r.id === receiptId) : null;
  const payTarget = payId ? rows.find((r) => r.id === payId) : null;

  const detailsFor = (pay) => {
    const policy = policies.find((p) => p.id === pay.policyId);
    return {
      policy,
      customer: customers.find((c) => c.id === pay.customerId),
      vehicle: vehicles.find((v) => v.id === policy?.vehicleId),
    };
  };

  const print = (pay) => {
    const d = detailsFor(pay);
    printDocument(`Receipt ${pay.id}`, receiptHtml({ payment: pay, ...d, company: settings.company }));
  };

  const columns = [
    { key: "id", label: "Payment No.", render: (r) => <span className="font-mono text-xs font-bold">{r.id}</span> },
    { key: "customer", label: "Customer" },
    { key: "policyId", label: "Policy" },
    { key: "amount", label: "Amount", render: (r) => <span className="font-medium">{inr(r.amount)}</span> },
    { key: "dateLabel", label: "Date" },
    { key: "modeLabel", label: "Mode" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === "Paid" && (
            <button onClick={() => setReceiptId(r.id)} title="Receipt" className={iconAction}><Receipt className="h-4 w-4" /></button>
          )}
          {user.canWrite && (r.status === "Pending" || r.status === "Failed") && (
            <button onClick={() => { setPayId(r.id); setMode("UPI"); }} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              Mark Paid
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Premium payments for all policies. Payments are created when a policy is issued or renewed." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Premium Collected" value={inr(collected)} icon={IndianRupee} color="green" note={`${count("Paid")} paid payments`} />
        <StatCard title="Pending Amount" value={inr(pendingAmt)} icon={Clock} color="amber" note={`${count("Pending")} pending`} />
        <StatCard title="Failed" value={count("Failed")} icon={XCircle} color="red" note="Needs follow-up" />
        <StatCard title="Collected This Month" value={inr(thisMonth)} icon={CalendarDays} color="blue" note="Paid in current month" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="bg-hero relative overflow-hidden rounded-2xl p-5 text-white lg:col-span-3">
          <p className="text-sm text-slate-200">Collected, last 6 months</p>
          <p className="font-display text-3xl font-bold text-gold-gradient">{inr(monthly.reduce((a, b) => a + b.v, 0))}</p>
          <div className="mt-3 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#F4D9A0" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#F4D9A01f" }} formatter={(v) => inr(v)} contentStyle={{ background: "#46341F", border: "1px solid #F4D9A066", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                <Bar dataKey="v" name="Collected" radius={[8, 8, 0, 0]}>
                  {monthly.map((_, i) => <Cell key={i} fill={i === monthly.length - 1 ? "#F4D9A0" : "#C8792C"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <p className="font-display text-lg font-bold text-gray-900 dark:text-white">Payment modes</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">How customers pay you</p>
          {modeSum === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No paid payments yet</p>
          ) : (
            <>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                {modeTotals.filter((x) => x.v).map((x) => <div key={x.m} className={modeColor[x.m]} style={{ width: `${(x.v / modeSum) * 100}%` }} />)}
              </div>
              <ul className="mt-4 space-y-2.5">
                {modeTotals.map((x) => (
                  <li key={x.m} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600 dark:text-slate-300"><span className={`h-2.5 w-2.5 rounded-full ${modeColor[x.m]}`} />{x.m}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{inr(x.v)} <span className="font-normal text-gray-400">· {Math.round((x.v / modeSum) * 100)}%</span></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <FilterChips value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f, count: count(f) }))} />

      <DataTable key={q} initialQuery={q} columns={columns} data={shown} pageSize={6} />

      {/* Receipt */}
      <Modal open={!!receipt} onClose={() => setReceiptId(null)} title={receipt ? `Receipt ${receipt.id}` : ""}>
        {receipt && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 dark:bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Amount received</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inr(receipt.amount)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Info label="Customer" value={receipt.customer} />
              <Info label="Policy" value={receipt.policyId} />
              <Info label="Date" value={receipt.dateLabel} />
              <Info label="Mode" value={receipt.modeLabel} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReceiptId(null)} className={btnGhost}>Close</button>
              <button onClick={() => print(receipt)} className={btnPrimary}><Printer className="h-4 w-4" /> Print Receipt</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Mark as paid */}
      <Modal open={!!payTarget} onClose={() => setPayId(null)} title="Record Payment">
        {payTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {payTarget.id} · {payTarget.customer} · <span className="font-semibold text-gray-900 dark:text-white">{inr(payTarget.amount)}</span>
            </p>
            <Field label="Payment Mode">
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
                {MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <p className="text-xs text-gray-500 dark:text-slate-400">Payment date will be recorded as today ({fmtDate(today)}).</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPayId(null)} className={btnGhost}>Cancel</button>
              <button
                onClick={() => { updatePayment(payTarget.id, { status: "Paid", mode, date: today }); setPayId(null); }}
                className={btnPrimary}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PaymentsPage;