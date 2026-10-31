function Info({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{value ?? "-"}</div>
    </div>
  );
}

export default Info;