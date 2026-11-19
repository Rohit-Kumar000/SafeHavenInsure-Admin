import { useMemo, useState } from "react";
import { IndianRupee, FileText, ClipboardList, Percent, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import DataTable from "../components/common/DataTable";
import FilterChips from "../components/common/FilterChips";
import PageHeader from "../components/common/PageHeader";
import { useTheme } from "../context/ThemeContext";
import { useData } from "../context/DataContext";
import { inputCls, btnGhost, card } from "../components/common/ui";
import { downloadCSV, fmtDate, inr, parseISO, toISO, todayISO } from "../utils/helpers";

const COLORS = ["#C8792C", "#E0B65A", "#10b981", "#B08D62", "#e11d48", "#8E5A2B"];
const CLAIM_STATUSES = ["Registered", "Under Review", "Approved", "Settled", "Rejected"];
const approvedOf = (c) => (c.status === "Approved" || c.status === "Settled" ? c.approvedAmount ?? c.amount : 0);

function ReportsPage() {
  const { customers, vehicles, policies, claims, payments } = useData();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const today = todayISO();

  const [range, setRange] = useState("year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState("overview");

  const bounds = useMemo(() => {
    const now = new Date();
    if (range === "month") return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    if (range === "3m") return { from: toISO(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today };
    if (range === "year") return { from: `${now.getFullYear()}-01-01`, to: today };
    if (range === "custom") return { from: from || "0000-01-01", to: to || "9999-12-31" };
    return { from: "0000-01-01", to: "9999-12-31" };
  }, [range, from, to, today]);

  const inRange = (d) => !!d && d >= bounds.from && d <= bounds.to;
  const nameOf = (id) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  const paidIn = payments.filter((p) => p.status === "Paid" && inRange(p.date));
  const polsIn = policies.filter((p) => inRange(p.issuedOn || p.startDate));
  const claimsIn = claims.filter((c) => inRange(c.date));
  const paymentsIn = payments.filter((p) => inRange(p.date));

  const revenue = paidIn.reduce((s, p) => s + p.amount, 0);
  const approved = claimsIn.reduce((s, c) => s + approvedOf(c), 0);
  const lossRatio = revenue > 0 ? ((approved / revenue) * 100).toFixed(1) + "%" : "-";

  // Monthly series
  const monthly = useMemo(() => {
    let start = bounds.from;
    if (start < "1900") {
      const dates = [...payments.map((p) => p.date), ...claims.map((c) => c.date)].filter(Boolean).sort();
      start = dates[0] || today;
    }
    const end = bounds.to > today ? today : bounds.to;
    const s = parseISO(start);
    const e = parseISO(end < start ? start : end);
    const list = [];
    let y = s.getFullYear();
    let m = s.getMonth();
    while (y < e.getFullYear() || (y === e.getFullYear() && m <= e.getMonth())) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      list.push({
        key,
        label: new Date(y, m, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" }),
        Premium: 0,
        Claims: 0,
      });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    const series = list.slice(-24);
    payments.filter((p) => p.status === "Paid" && p.date && p.date >= bounds.from && p.date <= bounds.to)
      .forEach((p) => { const r = series.find((x) => x.key === String(p.date).slice(0, 7)); if (r) r.Premium += p.amount; });
    claims.filter((c) => c.date && c.date >= bounds.from && c.date <= bounds.to)
      .forEach((c) => { const r = series.find((x) => x.key === String(c.date).slice(0, 7)); if (r) r.Claims += approvedOf(c); });
    return series;
  }, [bounds, payments, claims, today]);

  const byPlan = Object.entries(polsIn.reduce((a, p) => ({ ...a, [p.plan]: (a[p.plan] || 0) + 1 }), {})).map(([name, value]) => ({ name, value }));
  const byStatus = CLAIM_STATUSES.map((s) => ({ name: s, Claims: claimsIn.filter((c) => c.status === s).length }));

  const axis = dark ? "#D2BD94" : "#6D563D";
  const grid = dark ? "#6F5842" : "#E6C98A";
  const tip = {
    backgroundColor: dark ? "#4D3A29" : "#ffffff",
    border: `1px solid ${dark ? "#6F5842" : "#E2C996"}`,
    borderRadius: 8,
    color: dark ? "#fff" : "#261C12",
  };

  // Table rows
  const regOf = (policyId) => {
    const pol = policies.find((p) => p.id === policyId);
    return vehicles.find((v) => v.id === pol?.vehicleId)?.regNo ?? "-";
  };
  const policyRows = polsIn.map((p) => ({
    id: p.id, customer: nameOf(p.customerId), regNo: regOf(p.id), plan: p.plan,
    start: fmtDate(p.startDate), end: fmtDate(p.endDate), premium: p.premium, status: p.status,
  }));
  const claimRows = claimsIn.map((c) => ({
    id: c.id, customer: nameOf(c.customerId), policy: c.policyId, type: c.type,
    claimed: c.amount, approved: approvedOf(c), date: fmtDate(c.date), status: c.status,
  }));
  const paymentRows = paymentsIn.map((p) => ({
    id: p.id, customer: nameOf(p.customerId), policy: p.policyId, amount: p.amount,
    date: fmtDate(p.date), mode: p.mode || "-", status: p.status,
  }));

  const badge = (r) => <StatusBadge status={r.status} />;
  const tables = {
    policies: {
      file: "policies-report.csv", rows: policyRows,
      columns: [
        { key: "id", label: "Policy No." }, { key: "customer", label: "Customer" }, { key: "regNo", label: "Reg. No." },
        { key: "plan", label: "Plan" }, { key: "start", label: "Start" }, { key: "end", label: "End" },
        { key: "premium", label: "Premium", render: (r) => inr(r.premium) }, { key: "status", label: "Status", render: badge },
      ],
    },
    claims: {
      file: "claims-report.csv", rows: claimRows,
      columns: [
        { key: "id", label: "Claim No." }, { key: "customer", label: "Customer" }, { key: "policy", label: "Policy" },
        { key: "type", label: "Type" }, { key: "claimed", label: "Claimed", render: (r) => inr(r.claimed) },
        { key: "approved", label: "Approved", render: (r) => (r.approved ? inr(r.approved) : "-") },
        { key: "date", label: "Date" }, { key: "status", label: "Status", render: badge },
      ],
    },
    payments: {
      file: "payments-report.csv", rows: paymentRows,
      columns: [
        { key: "id", label: "Payment No." }, { key: "customer", label: "Customer" }, { key: "policy", label: "Policy" },
        { key: "amount", label: "Amount", render: (r) => inr(r.amount) }, { key: "date", label: "Date" },
        { key: "mode", label: "Mode" }, { key: "status", label: "Status", render: badge },
      ],
    },
  };

  const current = tables[tab];
  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "policies", label: "Policies", count: policyRows.length },
    { value: "claims", label: "Claims", count: claimRows.length },
    { value: "payments", label: "Payments", count: paymentRows.length },
  ];

  const noData = (msg) => <p className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-slate-500">{msg}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Business reports for the selected period. Tables can be downloaded as CSV." />

      {/* Period */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          value={range}
          onChange={setRange}
          options={[
            { value: "month", label: "This month" },
            { value: "3m", label: "Last 3 months" },
            { value: "year", label: "This year" },
            { value: "all", label: "All time" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} !w-auto`} />
            <span className="text-sm text-gray-400">to</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${inputCls} !w-auto`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Premium Collected" value={inr(revenue)} icon={IndianRupee} color="green" note={`${paidIn.length} payments`} />
        <StatCard title="Policies Issued" value={polsIn.length} icon={FileText} color="blue" note="In selected period" />
        <StatCard title="Claims Registered" value={claimsIn.length} icon={ClipboardList} color="amber" note={`${inr(approved)} approved`} />
        <StatCard title="Claims Ratio" value={lossRatio} icon={Percent} color="purple" note="Approved claims / premium" />
      </div>

      <FilterChips value={tab} onChange={setTab} options={tabs} />

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={`${card} lg:col-span-2`}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Premium vs Claims by Month</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">Premium collected and claim amount approved</p>
            <div className="h-72">
              {revenue === 0 && approved === 0 ? noData("No data in this period") : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                    <XAxis dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                    <Tooltip contentStyle={tip} formatter={(v) => inr(v)} cursor={{ fill: dark ? "#ffffff10" : "#C8792C14" }} />
                    <Legend wrapperStyle={{ color: axis, fontSize: 12 }} />
                    <Bar dataKey="Premium" fill="#C8792C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Claims" fill="#E0B65A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={card}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Policies by Plan</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">Issued in selected period</p>
            <div className="h-72">
              {byPlan.length === 0 ? noData("No policies in this period") : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byPlan} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4} stroke="none">
                      {byPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tip} />
                    <Legend wrapperStyle={{ color: axis, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={`${card} lg:col-span-3`}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Claims by Status</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">Registered in selected period</p>
            <div className="h-60">
              {claimsIn.length === 0 ? noData("No claims in this period") : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                    <XAxis dataKey="name" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tip} cursor={{ fill: dark ? "#ffffff10" : "#C8792C14" }} />
                    <Bar dataKey="Claims" fill="#C8792C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          key={tab}
          columns={current.columns}
          data={current.rows}
          pageSize={8}
          actions={
            <button onClick={() => downloadCSV(current.file, current.rows)} disabled={!current.rows.length} className={btnGhost}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
          }
        />
      )}
    </div>
  );
}

export default ReportsPage;