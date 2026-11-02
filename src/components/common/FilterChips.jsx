function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            value === o.value
              ? "border-transparent bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-md shadow-blue-900/20 "
              : "border-gray-300 bg-white text-gray-600 hover:border-gold-400 hover:text-gold-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-gold-500/60 dark:hover:text-gold-300"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export default FilterChips;
