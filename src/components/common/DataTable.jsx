import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

// columns: [{ key: "name", label: "Name", render?: (row) => JSX }]
function DataTable({ columns, data, searchable = true, pageSize = 5, actions, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="animate-fade-up rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
      {(searchable || actions) && (
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 ring-gold-400/40 transition focus-within:ring-2 dark:bg-slate-800 sm:w-72">
              <Search className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          ) : (
            <div />
          )}
          {actions}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400 dark:text-slate-500">
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id ?? i} className="transition hover:bg-gold-50/50 dark:hover:bg-slate-800/50">
                  {columns.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-slate-200">
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          {filtered.length === 0
            ? "0 results"
            : `Showing ${(current - 1) * pageSize + 1}-${Math.min(current * pageSize, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            className="rounded-lg border border-gray-200 p-1.5 hover:border-gold-400 hover:bg-gold-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2">{current} / {totalPages}</span>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current === totalPages}
            className="rounded-lg border border-gray-200 p-1.5 hover:border-gold-400 hover:bg-gold-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;