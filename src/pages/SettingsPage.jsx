import { useState } from "react";
import {Percent, Building2, Palette, Database, Sun, Moon, Download, Trash2, CheckCircle2 } from "lucide-react";
import Field from "../components/common/Field";
import Confirm from "../components/common/Confirm";
import PageHeader from "../components/common/PageHeader";
import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";
import { inputCls, btnPrimary, btnGhost, card } from "../components/common/ui";
import { downloadJSON, downloadExcel, todayISO } from "../utils/helpers";

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className={card}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function useFlash() {
  const [msg, setMsg] = useState("");
  const show = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  };
  const node = msg ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-4 w-4" /> {msg}
    </span>
  ) : null;
  return [node, show];
}


const TYPES = ["Car", "Two-Wheeler", "Commercial"];

function BusinessSection() {
  const { settings, updateSettings } = useData();
  const [gst, setGst] = useState(String(settings.gstRate));
  const [tp, setTp] = useState(Object.fromEntries(TYPES.map((t) => [t, String(settings.tpRates[t])])));
  const [od, setOd] = useState(Object.fromEntries(TYPES.map((t) => [t, String(settings.odRates[t])])));
  const [error, setError] = useState("");
  const [flash, show] = useFlash();

  const save = (e) => {
    e.preventDefault();
    const g = Number(gst);
    if (!(g >= 0 && g <= 50) || gst === "") return setError("GST rate must be between 0 and 50");
    for (const t of TYPES) {
      if (!(Number(tp[t]) > 0)) return setError(`Enter a third-party premium for ${t}`);
      if (!(Number(od[t]) > 0 && Number(od[t]) <= 20)) return setError(`Own-damage rate for ${t} must be between 0 and 20`);
    }
    setError("");
    updateSettings({
      gstRate: g,
      tpRates: Object.fromEntries(TYPES.map((t) => [t, Number(tp[t])])),
      odRates: Object.fromEntries(TYPES.map((t) => [t, Number(od[t])])),
    });
    show("Saved. New policies will use these rates");
  };

  const num = (v) => v.replace(/[^\d.]/g, "");

  return (
    <Section icon={Percent} title="Tax and Premium Rates" desc="Used by the premium calculator. Existing policies are not changed.">
      <form onSubmit={save} className="space-y-5">
        <div className="sm:w-1/3"><Field label="GST Rate (%)"><input value={gst} onChange={(e) => setGst(num(e.target.value))} className={inputCls} /></Field></div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">Third-party premium per year (₹)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TYPES.map((t) => (
              <Field key={t} label={t}><input value={tp[t]} onChange={(e) => setTp({ ...tp, [t]: num(e.target.value) })} className={inputCls} /></Field>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">Own-damage rate (% of IDV)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TYPES.map((t) => (
              <Field key={t} label={t}><input value={od[t]} onChange={(e) => setOd({ ...od, [t]: num(e.target.value) })} className={inputCls} /></Field>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-4"><button className={btnPrimary}>Save Rates</button>{flash}</div>
      </form>
    </Section>
  );
}

function CompanySection() {
  const { settings, updateSettings } = useData();
  const [c, setC] = useState(settings.company);
  const [error, setError] = useState("");
  const [flash, show] = useFlash();
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    if (!c.name.trim()) return setError("Company name is required");
    if (c.email && !/^\S+@\S+\.\S+$/.test(c.email.trim())) return setError("Enter a valid company email");
    if (c.phone && !/^[\d\s+-]{7,15}$/.test(c.phone.trim())) return setError("Enter a valid phone number");
    setError("");
    updateSettings({ company: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.trim()])) });
    show("Company details saved");
  };

  return (
    <Section icon={Building2} title="Company Details" desc="Printed on policy certificates and payment receipts.">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company Name"><input value={c.name} onChange={set("name")} className={inputCls} /></Field>
          <Field label="Registration No."><input value={c.regNo} onChange={set("regNo")} className={inputCls} /></Field>
          <Field label="Email"><input value={c.email} onChange={set("email")} className={inputCls} /></Field>
          <Field label="Phone"><input value={c.phone} onChange={set("phone")} className={inputCls} /></Field>
        </div>
        <Field label="Address"><textarea rows={2} value={c.address} onChange={set("address")} className={inputCls} /></Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-4"><button className={btnPrimary}>Save Details</button>{flash}</div>
      </form>
    </Section>
  );
}

function DataSection() {
  const { customers, vehicles, policies, claims, payments, exportData, clearAll } = useData();
  const [confirm, setConfirm] = useState(null);
  const counts = [["Customers", customers.length], ["Vehicles", vehicles.length], ["Policies", policies.length], ["Claims", claims.length], ["Payments", payments.length]];

  return (
    <Section icon={Database} title="Data Management" desc="Your data is stored securely in Appwrite. Download a backup copy whenever you like.">
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(([label, n]) => (
          <div key={label} className="rounded-xl bg-gray-50 p-3 text-center dark:bg-slate-800">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{n}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => downloadJSON(`safehaven-backup-${todayISO()}.json`, exportData())} className={btnGhost}>
          <Download className="h-4 w-4" /> Download Backup
        </button>
        <button onClick={() => downloadExcel(`safehaven-export-${todayISO()}.xlsx`, exportData())} className={btnGhost}>
          <Download className="h-4 w-4" /> Export to Excel
        </button>
        <button onClick={() => setConfirm("clear")} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10">
          <Trash2 className="h-4 w-4" /> Clear All Records
        </button>
      </div>

      <Confirm
        open={confirm === "clear"} onClose={() => setConfirm(null)} title="Clear All Records" danger confirmLabel="Delete Everything"
        message="This permanently deletes all customers, vehicles, policies, claims and payments. Plans and settings are kept. Download a backup first if you may need this data."
        onConfirm={() => { clearAll(); setConfirm(null); }}
      />
    </Section>
  );
}

function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account, rates, company details and data." />

      <BusinessSection />
      <CompanySection />

      <Section icon={Palette} title="Appearance" desc="Choose how the admin panel looks.">
        <div className="flex gap-3">
          {[["light", "Light", Sun], ["dark", "Dark", Moon]].map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => theme !== value && toggleTheme()}
              className={`flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                theme === value
                  ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </Section>

      <DataSection />
    </div>
  );
}

export default SettingsPage;