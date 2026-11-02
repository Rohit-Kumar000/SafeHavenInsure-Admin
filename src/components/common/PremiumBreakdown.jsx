import { inr } from "../../utils/helpers";

function Row({ label, value, bold, negative, muted }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 text-sm ${bold ? "font-bold text-gray-900 dark:text-white" : muted ? "text-gray-400 dark:text-slate-500" : "text-gray-600 dark:text-slate-300"}`}>
      <span>{label}</span>
      <span className={negative ? "text-green-600 dark:text-green-400" : ""}>{negative ? "- " : ""}{inr(value)}</span>
    </div>
  );
}

function PremiumBreakdown({ calc }) {
  if (!calc) {
    return (
      <p className="py-6 text-center text-sm text-gray-400 dark:text-slate-500">
        Select a customer, vehicle and plan to see the premium.
      </p>
    );
  }
  return (
    <div>
      {calc.tp > 0 && <Row label="Third-party premium" value={calc.tp} />}
      {calc.odBase > 0 && <Row label="Own-damage premium" value={calc.odBase} />}
      {calc.ncbAmt > 0 && <Row label={`NCB discount (${calc.ncbPct}%)`} value={calc.ncbAmt} negative />}
      {calc.addonItems.map((a) => (
        <Row key={a.name} label={a.name} value={a.amount} />
      ))}
      <div className="my-2 border-t border-dashed border-gray-200 dark:border-slate-700" />
      <Row label="Net premium" value={calc.net} />
      <Row label={`GST (${calc.gstRate}%)`} value={calc.gst} />
      <div className="my-2 border-t border-gray-200 dark:border-slate-700" />
      <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
        <span className="font-semibold text-gray-900 dark:text-white">Total payable</span>
        <span className="text-xl font-bold text-blue-800 dark:text-blue-400">{inr(calc.total)}</span>
      </div>
    </div>
  );
}

export default PremiumBreakdown;