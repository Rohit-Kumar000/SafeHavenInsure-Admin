import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, FileCheck2, IndianRupee, ClipboardList, FilePlus, ArrowRight, CalendarDays,
  TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, CreditCard, FileText, Sparkles, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useData } from "../context/DataContext";
import useCountUp from "../hooks/useCountUp";
import { inr, daysBetween, todayISO } from "../utils/helpers";

const NAVY = "#15324b";
const GOLD = "#2563EB";
const PALETTE = ["#2563EB", "#14b8a6", "#10b981", "#0F766E", "#e11d48", "#1D4ED8"];

const compact = (n) => {
  const v = Math.abs(n);
  if (v >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ---------- small reusable pieces ----------
function Panel({ title, subtitle, to, action, children, className = "" }) {
  return (
    <section className={`animate-fade-up rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-14px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {action}
        {to && (
          <Link to={to} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-gold-300">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ icon: Icon = Sparkles, text, to, cta }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-600 dark:bg-gold-500/10 dark:text-gold-300">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm text-gray-500 dark:text-slate-400">{text}</p>
      {to && <Link to={to} className="text-sm font-semibold text-blue-700 hover:underline dark:text-gold-300">{cta}</Link>}
    </div>
  );
}

function ChartTip({ active, payload, label, money = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gold-300/50 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-gold-500/30 dark:bg-slate-900/95">
      {label && <p className="mb-1 font-semibold text-gray-900 dark:text-white">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {p.name}: <b className="text-gray-900 dark:text-white">{money ? inr(p.value) : p.value}</b>
        </p>
      ))}
    </div>
  );
}

function Delta({ now, prev }) {
  if (!prev && !now) return <span className="text-xs text-gray-400 dark:text-slate-500">No change</span>;
  const pct = prev ? Math.round(((now - prev) / prev) * 100) : 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${up ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {Math.abs(pct)}%
    </span>
  );
}

function Kpi({ title, value, format = (v) => Math.round(v).toLocaleString("en-IN"), icon: Icon, spark, now, prev, note, accent = NAVY, to }) {
  const shown = useCountUp(value);
  const id = `sp-${title.replace(/\W/g, "")}`;
  return (
    <Link to={to} className="group animate-fade-up relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-14px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-gold-500/40">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 truncate font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{format(shown)}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Delta now={now} prev={prev} />
          <span className="truncate text-xs text-gray-400 dark:text-slate-500">{note}</span>
        </div>
      </div>
      <div className="-mx-5 -mb-5 mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={2} fill={`url(#${id})`} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Link>
  );
}

// ---------- main page ----------
function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const { customers, vehicles, policies, claims, payments } = useData();
  const [range, setRange] = useState(12);

  const m = useMemo(() => {
    const now = new Date();
    const today = todayISO();
    const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { key: monthKey(d), label: d.toLocaleString("en-IN", { month: "short" }), revenue: 0, claimsPaid: 0, customers: 0, policies: 0, claimsN: 0 };
    });
    const at = (key) => months.find((x) => x.key === key);

    const paid = payments.filter((p) => p.status === "Paid");
    paid.forEach((p) => { const r = at(String(p.date).slice(0, 7)); if (r) r.revenue += p.amount; });
    claims.filter((c) => ["Approved", "Settled"].includes(c.status)).forEach((c) => {
      const r = at(String(c.date).slice(0, 7)); if (r) r.claimsPaid += c.approvedAmount || 0;
    });
    customers.forEach((c) => { const r = at(String(c.createdAt || "").slice(0, 7)); if (r) r.customers += 1; });
    policies.forEach((p) => { const r = at(String(p.issuedOn || p.startDate).slice(0, 7)); if (r) r.policies += 1; });
    claims.forEach((c) => { const r = at(String(c.date).slice(0, 7)); if (r) r.claimsN += 1; });

    const cur = months[11];
    const prev = months[10];
    const active = policies.filter((p) => p.status === "Active");
    const openClaims = claims.filter((c) => ["Registered", "Under Review"].includes(c.status));
    const collected = paid.reduce((s, p) => s + p.amount, 0);
    const pendingAmt = payments.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
    const kycOk = customers.filter((c) => c.kyc === "Verified").length;

    // renewals buckets
    const due = active.filter((p) => !p.renewedBy).map((p) => ({ ...p, left: daysBetween(today, p.endDate) }));
    const expiredNotRenewed = policies.filter((p) => p.status === "Expired" && !p.renewedBy).length;
    const buckets = [
      { label: "Expired", n: expiredNotRenewed, tone: "bg-red-500", text: "text-red-600 dark:text-red-400" },
      { label: "≤ 7 days", n: due.filter((p) => p.left <= 7).length, tone: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
      { label: "8–30 days", n: due.filter((p) => p.left > 7 && p.left <= 30).length, tone: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
      { label: "31–60 days", n: due.filter((p) => p.left > 30 && p.left <= 60).length, tone: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    ];
    const urgent = due.filter((p) => p.left <= 30).sort((a, b) => a.left - b.left);

    // donut + plan bars + cities
    const byType = {};
    policies.forEach((p) => { const t = vehicles.find((v) => v.id === p.vehicleId)?.type; if (t) byType[t] = (byType[t] || 0) + 1; });
    const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));
    const byPlan = {};
    policies.forEach((p) => { byPlan[p.plan] = (byPlan[p.plan] || 0) + p.premium; });
    const planData = Object.entries(byPlan).map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 13) + "…" : name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const byCity = {};
    customers.forEach((c) => { if (c.city) byCity[c.city] = (byCity[c.city] || 0) + 1; });
    const cityData = Object.entries(byCity).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    // claims pipeline
    const stages = [["Registered", "#0F766E"], ["Under Review", "#14b8a6"], ["Approved", "#10b981"], ["Settled", "#2563EB"], ["Rejected", "#e11d48"]]
      .map(([name, color]) => ({ name, color, n: claims.filter((c) => c.status === name).length }));

    // collection health
    const paidN = paid.length;
    const collectionRate = payments.length ? Math.round((paidN / payments.length) * 100) : 0;

    // activity
    const cname = (id) => customers.find((c) => c.id === id)?.name || "Customer";
    const feed = [
      ...policies.map((p) => ({ k: "p", t: p.issuedOn || p.startDate, id: p.id, title: `Policy ${p.id} issued`, sub: `${cname(p.customerId)} · ${p.plan}`, amt: inr(p.premium) })),
      ...claims.map((c) => ({ k: "c", t: c.date, id: c.id, title: `Claim ${c.id} ${c.status.toLowerCase()}`, sub: `${cname(c.customerId)} · ${c.type}`, amt: inr(c.amount) })),
      ...paid.map((p) => ({ k: "$", t: p.date, id: p.id, title: `Payment ${p.id} received`, sub: `${cname(p.customerId)} · ${p.mode || "-"}`, amt: inr(p.amount) })),
    ].sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 7);

    return { months, cur, prev, active, openClaims, collected, pendingAmt, kycOk, buckets, urgent, typeData, planData, cityData, stages, collectionRate, feed, now };
  }, [customers, vehicles, policies, claims, payments]);

  const axis = dark ? "#94a3b8" : "#475569";
  const grid = dark ? "#334155" : "#e2e8f0";
  const series = m.months.slice(12 - range);
  const totalRange = series.reduce((s, x) => s + x.revenue, 0);
  const sp = (key) => m.months.slice(6).map((x) => ({ v: x[key] }));
  const hasRevenue = series.some((x) => x.revenue || x.claimsPaid);
  const totalClaimsOpen = m.openClaims.length;

  return (
    <div className="space-y-6">
      {/* ===== HERO ===== */}
      <div className="bg-hero animate-fade-up relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl shadow-blue-950/30 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-gold-400/25" />
        <div className="pointer-events-none absolute -right-6 -top-10 h-48 w-48 rounded-full border border-gold-400/25" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold-200">
              <CalendarDays className="h-3.5 w-3.5" />
              {m.now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              {greeting()}, <span className="text-gold-gradient">{user?.name?.split(" ")[0] || "Admin"}</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gold-200">
              {totalClaimsOpen || m.urgent.length
                ? <>You have <b className="text-white">{totalClaimsOpen} open claim{totalClaimsOpen === 1 ? "" : "s"}</b> and <b className="text-white">{m.urgent.length} renewal{m.urgent.length === 1 ? "" : "s"}</b> due within 30 days.</>
                : "Everything is on track. Add a customer and issue a policy to see your portfolio come alive."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/policies/new" className="inline-flex items-center gap-2 rounded-xl bg-gold-sheen px-4 py-2.5 text-sm font-bold text-blue-950 shadow-lg transition hover:brightness-110 active:scale-[0.98]">
                <FilePlus className="h-4 w-4" /> New Policy
              </Link>
              <Link to="/customers" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
                <Users className="h-4 w-4" /> Add Customer
              </Link>
              <Link to="/claims" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
                <ClipboardList className="h-4 w-4" /> Claims
              </Link>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-3 lg:w-auto lg:min-w-[22rem]">
            {[
              { l: "This month", v: compact(m.cur.revenue), s: "premium" },
              { l: "Pending", v: compact(m.pendingAmt), s: "to collect" },
              { l: "KYC done", v: customers.length ? `${Math.round((m.kycOk / customers.length) * 100)}%` : "0%", s: "customers" },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                <p className="text-[11px] uppercase tracking-wider text-gold-200">{x.l}</p>
                <p className="mt-1 font-display text-xl font-bold text-gold-gradient sm:text-2xl">{x.v}</p>
                <p className="text-[11px] text-gold-300/80">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== KPI ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Premium Collected" value={m.collected} format={(v) => inr(v)} icon={IndianRupee} spark={sp("revenue")} now={m.cur.revenue} prev={m.prev.revenue} note="vs last month" accent={GOLD} to="/payments" />
        <Kpi title="Active Policies" value={m.active.length} icon={FileCheck2} spark={sp("policies")} now={m.cur.policies} prev={m.prev.policies} note={`of ${policies.length} total`} accent={NAVY} to="/policies" />
        <Kpi title="Customers" value={customers.length} icon={Users} spark={sp("customers")} now={m.cur.customers} prev={m.prev.customers} note={`${m.kycOk} KYC verified`} accent="#10b981" to="/customers" />
        <Kpi title="Open Claims" value={totalClaimsOpen} icon={ClipboardList} spark={sp("claimsN")} now={m.cur.claimsN} prev={m.prev.claimsN} note={`${claims.length} total`} accent="#e11d48" to="/claims" />
      </div>

      {/* ===== REVENUE + COLLECTION ===== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Premium vs Claims Paid"
          subtitle={`${inr(totalRange)} collected in the last ${range} months`}
          action={
            <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold dark:bg-slate-800">
              {[6, 12].map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 transition ${range === r ? "bg-white text-blue-800 shadow dark:bg-slate-700 dark:text-gold-300" : "text-gray-500 dark:text-slate-400"}`}>{r}M</button>
              ))}
            </div>
          }
        >
          {!hasRevenue ? (
            <Empty icon={IndianRupee} text="Revenue will appear here once payments are marked Paid." to="/policies/new" cta="Issue a policy" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={NAVY} stopOpacity={0.4} /><stop offset="100%" stopColor={NAVY} stopOpacity={0} /></linearGradient>
                    <linearGradient id="gClm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.35} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" name="Premium" dataKey="revenue" stroke={dark ? "#f4f7fb" : NAVY} strokeWidth={3} fill="url(#gRev)" activeDot={{ r: 6 }} />
                  <Area type="monotone" name="Claims paid" dataKey="claimsPaid" stroke={GOLD} strokeWidth={2.5} fill="url(#gClm)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Collection Health" subtitle="Share of payments received">
          <div className="relative mx-auto h-52 max-w-[14rem]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ v: m.collectionRate, fill: "url(#gRad)" }]} startAngle={90} endAngle={-270}>
                <defs>
                  <linearGradient id="gRad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f4f7fb" /><stop offset="100%" stopColor="#2563EB" /></linearGradient>
                </defs>
                <RadialBar dataKey="v" background={{ fill: dark ? "#1e293b" : "#f4f7fb" }} cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-4xl font-bold text-gray-900 dark:text-white">{m.collectionRate}%</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">collected</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Received</p>
              <p className="font-display text-lg font-bold text-emerald-800 dark:text-emerald-300">{compact(m.collected)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
              <p className="text-xs text-amber-700 dark:text-amber-400">Pending</p>
              <p className="font-display text-lg font-bold text-amber-800 dark:text-amber-300">{compact(m.pendingAmt)}</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* ===== PORTFOLIO ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Portfolio Mix" subtitle="Policies by vehicle type">
          {m.typeData.length === 0 ? (
            <Empty icon={ShieldCheck} text="No policies yet" to="/policies/new" cta="Issue first policy" />
          ) : (
            <>
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={m.typeData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={4} stroke="none" cornerRadius={6}>
                      {m.typeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTip money={false} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display text-3xl font-bold text-gray-900 dark:text-white">{policies.length}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">policies</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-slate-300">
                {m.typeData.map((d, i) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{d.name} ({d.value})</span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title="Revenue by Plan" subtitle="Total premium written">
          {m.planData.length === 0 ? (
            <Empty icon={FileText} text="Plan revenue shows after your first policy" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.planData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                  <XAxis type="number" stroke={axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <YAxis type="category" dataKey="name" stroke={axis} fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: dark ? "#ffffff10" : "#2563EB14" }} />
                  <Bar dataKey="value" name="Premium" radius={[0, 8, 8, 0]} barSize={18}>
                    {m.planData.map((_, i) => <Cell key={i} fill={i === 0 ? GOLD : NAVY} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Claims Pipeline" subtitle={`${claims.length} claims in total`} to="/claims">
          {claims.length === 0 ? (
            <Empty icon={ClipboardList} text="No claims registered" />
          ) : (
            <div className="space-y-4">
              {m.stages.map((s) => (
                <div key={s.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-slate-300">{s.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{s.n}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.n / claims.length) * 100}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ===== RENEWALS + ACTIVITY ===== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel className="xl:col-span-2" title="Renewal Radar" subtitle="Policies that need a follow-up" to="/renewals">
          <div className="grid grid-cols-2 gap-3">
            {m.buckets.map((b) => (
              <div key={b.label} className="relative overflow-hidden rounded-xl border border-gray-200/80 p-3 dark:border-slate-800">
                <span className={`absolute inset-y-0 left-0 w-1 ${b.tone}`} />
                <p className="pl-2 text-xs text-gray-500 dark:text-slate-400">{b.label}</p>
                <p className={`pl-2 font-display text-2xl font-bold ${b.text}`}>{b.n}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-slate-800">
            {m.urgent.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"><AlertTriangle className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{customers.find((c) => c.id === p.customerId)?.name || "Customer"}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-slate-400">{p.id} · {p.plan}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${p.left <= 7 ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"}`}>
                  {p.left <= 0 ? "Today" : `${p.left}d left`}
                </span>
              </div>
            ))}
            {m.urgent.length === 0 && <p className="py-4 text-center text-sm text-gray-400 dark:text-slate-500">No renewals due in 30 days</p>}
          </div>
        </Panel>

        <Panel className="xl:col-span-3" title="Live Activity" subtitle="Latest policies, claims and payments">
          {m.feed.length === 0 ? (
            <Empty icon={RefreshCw} text="Activity shows up here as you work" />
          ) : (
            <ol className="relative space-y-4 border-l border-gray-200 pl-6 dark:border-slate-800">
              {m.feed.map((f) => {
                const Icon = f.k === "p" ? FileText : f.k === "c" ? ClipboardList : CreditCard;
                const tone = f.k === "p" ? "bg-blue-600" : f.k === "c" ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <li key={`${f.k}${f.id}`} className="relative">
                    <span className={`absolute -left-[2.15rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white ring-4 ring-white dark:ring-slate-900 ${tone}`}><Icon className="h-3 w-3" /></span>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{f.title}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400">{f.sub}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{f.amt}</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">{String(f.t).slice(0, 10)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>

      {/* ===== CITIES ===== */}
      {m.cityData.length > 0 && (
        <Panel title="Top Cities" subtitle="Where your customers are">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {m.cityData.map((c, i) => (
              <div key={c.name} className="rounded-xl border border-gray-200/80 p-4 text-center transition hover:border-gold-300 dark:border-slate-800 dark:hover:border-gold-500/40">
                <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
                <p className="truncate text-xs text-gray-500 dark:text-slate-400">{c.name}</p>
                <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export default DashboardPage;
