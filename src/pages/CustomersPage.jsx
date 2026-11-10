import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, BadgeCheck, Clock, Plus, Pencil, Trash2, AlertTriangle, Phone, Mail, MapPin, Car, FileText } from "lucide-react";
import StatCard from "../components/common/StatCard";
import PageHeader from "../components/common/PageHeader";
import FilterChips from "../components/common/FilterChips";
import { SearchBox, ViewToggle, EmptyState } from "../components/common/Toolbar";
import { btnPrimary, iconAction } from "../components/common/ui";
import StatusBadge from "../components/common/StatusBadge";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import CustomerForm from "../components/forms/CustomerForm";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

function CustomersPage() {
  const {
    customers: list,
    vehicles,
    policies,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerImpact,
  } = useData();
  const { user } = useAuth();

  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const [query, setQuery] = useState(q);
  const [kyc, setKyc] = useState("all");
  const [view, setView] = useState("grid");
  const [shown, setShown] = useState(12);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // customer being edited, or null
  const [deleting, setDeleting] = useState(null); // customer pending delete

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSave = (data) => {
    if (editing) updateCustomer(editing.id, data);
    else addCustomer(data);
    closeForm();
  };

  const confirmDelete = () => {
    deleteCustomer(deleting.id);
    setDeleting(null);
  };

  const verified = list.filter((c) => c.kyc === "Verified").length;
  const pending = list.filter((c) => c.kyc === "Pending").length;

  const impact = deleting ? getCustomerImpact(deleting.id) : null;
  const linkedItems = impact
    ? [
        { label: "vehicles", n: impact.vehicles },
        { label: "policies", n: impact.policies },
        { label: "claims", n: impact.claims },
        { label: "payments", n: impact.payments },
      ].filter((x) => x.n > 0)
    : [];

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return list.filter(
      (c) =>
        (kyc === "all" || c.kyc === kyc) &&
        (!t || [c.name, c.phone, c.email, c.city].some((v) => String(v || "").toLowerCase().includes(t)))
    );
  }, [list, query, kyc]);

  const counts = (id) => ({
    v: vehicles.filter((x) => x.customerId === id).length,
    p: policies.filter((x) => x.customerId === id).length,
  });

  const columns = [
    {
      key: "name",
      label: "Customer",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-luxe text-sm font-semibold text-gold-200">{r.name.charAt(0)}</div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "kyc", label: "KYC Status", render: (r) => <StatusBadge status={r.kyc} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          {user.canWrite && <button onClick={() => openEdit(r)} title="Edit" className={iconAction}><Pencil className="h-4 w-4" /></button>}
          {user.canDelete && <button onClick={() => setDeleting(r)} title="Delete" className={iconAction}><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Your policyholders, their contact details and KYC status.">
        {user.canWrite && <button onClick={openAdd} className={btnPrimary}><Plus className="h-4 w-4" /> Add Customer</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Customers" value={list.length} icon={Users} color="blue" note="All registered" />
        <StatCard title="KYC Verified" value={verified} icon={BadgeCheck} color="green" note="Documents approved" />
        <StatCard title="KYC Pending" value={pending} icon={Clock} color="amber" note="Awaiting review" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox value={query} onChange={(v) => { setQuery(v); setShown(12); }} placeholder="Search name, phone, email, city" />
        <div className="flex items-center justify-between gap-3">
          <FilterChips
            value={kyc}
            onChange={(v) => { setKyc(v); setShown(12); }}
            options={[
              { value: "all", label: "All", count: list.length },
              { value: "Verified", label: "Verified", count: verified },
              { value: "Pending", label: "Pending", count: pending },
            ]}
          />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" text="Add your first customer to start issuing policies." action={user.canWrite ? <button onClick={openAdd} className={btnPrimary}><Plus className="h-4 w-4" /> Add Customer</button> : null} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No match" text="Try a different search or filter." />
      ) : view === "list" ? (
        <DataTable key={query + kyc} columns={columns} data={filtered} pageSize={8} searchable={false} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, shown).map((c) => {
              const n = counts(c.id);
              return (
                <div key={c.id} className="group animate-fade-up relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-gold-500/40">
                  <div className="bg-luxe pattern-dots h-16" />
                  <div className="-mt-8 px-5 pb-5">
                    <div className="flex items-end justify-between">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white font-display text-2xl font-bold text-blue-900 shadow-lg ring-4 ring-white dark:bg-slate-800 dark:text-gold-300 dark:ring-slate-900">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        {user.canWrite && <button onClick={() => openEdit(c)} title="Edit" className={iconAction}><Pencil className="h-4 w-4" /></button>}
                        {user.canDelete && <button onClick={() => setDeleting(c)} title="Delete" className={iconAction}><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-lg font-bold text-gray-900 dark:text-white">{c.name}</h3>
                      <StatusBadge status={c.kyc} />
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-slate-300">
                      <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gold-600" />{c.phone}</li>
                      <li className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0 text-gold-600" /><span className="truncate">{c.email}</span></li>
                      <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gold-600" />{c.city}</li>
                    </ul>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 text-center dark:border-slate-800">
                      <div><p className="flex items-center justify-center gap-1.5 font-display text-xl font-bold text-gray-900 dark:text-white"><Car className="h-4 w-4 text-blue-700 dark:text-blue-400" />{n.v}</p><p className="text-xs text-gray-500 dark:text-slate-400">Vehicles</p></div>
                      <div><p className="flex items-center justify-center gap-1.5 font-display text-xl font-bold text-gray-900 dark:text-white"><FileText className="h-4 w-4 text-blue-700 dark:text-blue-400" />{n.p}</p><p className="text-xs text-gray-500 dark:text-slate-400">Policies</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > shown && (
            <div className="text-center">
              <button onClick={() => setShown((n) => n + 12)} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gold-400 hover:text-gold-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-gold-300">
                Show more ({filtered.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit Customer" : "Add New Customer"}
      >
        <CustomerForm
          key={editing ? editing.id : "new"}
          initial={editing}
          existing={list}
          onSave={handleSave}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Customer">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-300">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{deleting?.name}</span>?
              This action cannot be undone.
            </p>
            {linkedItems.length > 0 && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                This will also permanently delete:{" "}
                {linkedItems.map((x) => `${x.n} ${x.label}`).join(", ")}.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setDeleting(null)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default CustomersPage;