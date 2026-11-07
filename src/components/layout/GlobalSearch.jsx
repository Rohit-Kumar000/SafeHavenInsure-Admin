import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Users, Car, FileText, ClipboardList, CreditCard, X,
} from "lucide-react";
import { useData } from "../../context/DataContext";

const LIMIT = 4;

function GlobalSearch({ autoFocus = false, shortcut = false, onDone }) {
  const { customers, vehicles, policies, claims, payments } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Ctrl + K focuses the search box
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const nameOf = (id) => customers.find((c) => c.id === id)?.name ?? "Unknown";
    const regOf = (id) => vehicles.find((v) => v.id === id)?.regNo ?? "";
    const has = (...vals) => vals.some((v) => String(v ?? "").toLowerCase().includes(q));
    const link = (path, term) => `${path}?q=${encodeURIComponent(term)}`;

    const result = [
      {
        label: "Customers",
        icon: Users,
        items: customers
          .filter((c) => has(c.name, c.phone, c.email, c.city))
          .map((c) => ({
            key: `c-${c.id}`,
            title: c.name,
            sub: `${c.phone} · ${c.city}`,
            to: link("/customers", c.name),
          })),
      },
      {
        label: "Vehicles",
        icon: Car,
        items: vehicles
          .filter((v) => has(v.regNo, v.make, v.model, nameOf(v.customerId)))
          .map((v) => ({
            key: `v-${v.id}`,
            title: v.regNo,
            sub: `${v.make} ${v.model} · ${nameOf(v.customerId)}`,
            to: link("/vehicles", v.regNo),
          })),
      },
      {
        label: "Policies",
        icon: FileText,
        items: policies
          .filter((p) => has(p.id, p.plan, nameOf(p.customerId), regOf(p.vehicleId)))
          .map((p) => ({
            key: `p-${p.id}`,
            title: p.id,
            sub: `${p.plan} · ${nameOf(p.customerId)}`,
            to: link("/policies", p.id),
          })),
      },
      {
        label: "Claims",
        icon: ClipboardList,
        items: claims
          .filter((c) => has(c.id, c.policyId, c.type, nameOf(c.customerId)))
          .map((c) => ({
            key: `cl-${c.id}`,
            title: c.id,
            sub: `${c.type} · ${nameOf(c.customerId)}`,
            to: link("/claims", c.id),
          })),
      },
      {
        label: "Payments",
        icon: CreditCard,
        items: payments
          .filter((p) => has(p.id, p.policyId, nameOf(p.customerId)))
          .map((p) => ({
            key: `pay-${p.id}`,
            title: p.id,
            sub: `${p.policyId} · ${nameOf(p.customerId)}`,
            to: link("/payments", p.id),
          })),
      },
    ];

    return result
      .filter((g) => g.items.length > 0)
      .map((g) => ({ ...g, items: g.items.slice(0, LIMIT) }));
  }, [query, customers, vehicles, policies, claims, payments]);

  const flat = groups.flatMap((g) => g.items);

  const go = (item) => {
    navigate(item.to);
    setOpen(false);
    setQuery("");
    onDone?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      onDone?.();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (flat.length ? (a + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  };

  let index = -1;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 ring-blue-500/30 focus-within:ring-2 dark:bg-slate-800">
        <Search className="h-4 w-4 shrink-0 text-gray-500 dark:text-slate-400" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search anything..."
          className="w-full min-w-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-slate-500"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
            shortcut && (
            <span className="hidden shrink-0 whitespace-nowrap text-xs text-gray-400 dark:text-slate-500 lg:block">
              Ctrl + K
            </span>
          )
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 md:left-auto md:w-96">
          {flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
              No results for "{query.trim()}"
            </p>
          ) : (
            groups.map(({ label, icon: Icon, items }) => (
              <div key={label}>
                <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  {label}
                </p>
                {items.map((item) => {
                  index += 1;
                  const i = index;
                  return (
                    <button
                      key={item.key}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                        active === i
                          ? "bg-blue-50 dark:bg-slate-700"
                          : "hover:bg-gray-50 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-gray-500 dark:text-slate-400">
                          {item.sub}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;