function Field({ label, error, hint, children }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default Field;