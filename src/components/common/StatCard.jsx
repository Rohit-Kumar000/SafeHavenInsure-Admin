import { TrendingUp, TrendingDown } from "lucide-react";

const colors = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-gold-300",
  gold: "bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300",
  green: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  red: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
};

const bars = {
  blue: "bg-gradient-to-r from-blue-700 to-blue-400",
  gold: "bg-gold-sheen",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
};

// trend: number (positive = up, negative = down)
function StatCard({ title, value, icon: Icon, color = "blue", note, trend }) {
  const up = trend >= 0;

  return (
    <div className="group relative overflow-hidden animate-fade-up rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.14)] transition duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-gold-500/40">
      {/* Top colour line */}
      <div className={`absolute inset-x-0 top-0 h-1 ${bars[color]}`} />

      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 truncate font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110 ${colors[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
              up
                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            }`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {note && <span className="text-gray-400 dark:text-slate-500">{note}</span>}
      </div>
    </div>
  );
}

export default StatCard;