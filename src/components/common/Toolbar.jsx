import { Search, LayoutGrid, List, X } from "lucide-react";

export function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-9 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500"
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ViewToggle({ value, onChange, options = ["grid", "list"] }) {
  const icons = { grid: LayoutGrid, list: List };
  return (
    <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
      {options.map((o) => {
        const Icon = icons[o];
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            title={o}
            className={`rounded-lg p-2 transition ${value === o ? "bg-white text-blue-800 shadow dark:bg-slate-700 dark:text-gold-300" : "text-gray-500 hover:text-gray-800 dark:text-slate-400"}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-50 text-gold-600 dark:bg-gold-500/10 dark:text-gold-300">
        <Icon className="h-8 w-8" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-slate-400">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
