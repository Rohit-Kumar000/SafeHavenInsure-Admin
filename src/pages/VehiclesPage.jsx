import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Car, Bike, Truck, Plus, Pencil, Trash2, AlertTriangle, ShieldCheck, ShieldAlert, Fuel, Calendar, User,
} from "lucide-react";
import StatCard from "../components/common/StatCard";
import PageHeader from "../components/common/PageHeader";
import FilterChips from "../components/common/FilterChips";
import { SearchBox, ViewToggle, EmptyState } from "../components/common/Toolbar";
import { btnPrimary, iconAction } from "../components/common/ui";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import VehicleForm from "../components/forms/VehicleForm";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

function VehiclesPage() {
  const {
    customers,
    vehicles,
    policies,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleImpact,
  } = useData();
  const { user } = useAuth();

  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const [query, setQuery] = useState(q);
  const [type, setType] = useState("all");
  const [view, setView] = useState("grid");
  const [shown, setShown] = useState(12);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (v) => {
    setEditing(v);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSave = (data) => {
    if (editing) updateVehicle(editing.id, data);
    else addVehicle(data);
    closeForm();
  };

  const confirmDelete = () => {
    deleteVehicle(deleting.id);
    setDeleting(null);
  };

  // Rows with owner name and insured status (so search works on them too)
  const rows = vehicles.map((v) => ({
    ...v,
    owner: customers.find((c) => c.id === v.customerId)?.name ?? "Unknown",
    vehicle: `${v.make} ${v.model}`,
    insured: policies.some((p) => p.vehicleId === v.id && p.status === "Active")
      ? "Insured"
      : "Not Insured",
  }));

  const count = (type) => vehicles.filter((v) => v.type === type).length;
  const insuredCount = rows.filter((r) => r.insured === "Insured").length;

  const impact = deleting ? getVehicleImpact(deleting.id) : null;
  const linkedItems = impact
    ? [
        { label: "policies", n: impact.policies },
        { label: "claims", n: impact.claims },
        { label: "payments", n: impact.payments },
      ].filter((x) => x.n > 0)
    : [];

  const columns = [
    {
      key: "regNo",
      label: "Reg. No.",
      render: (r) => (
        <span className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-xs font-semibold tracking-wide text-gray-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          {r.regNo}
        </span>
      ),
    },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{r.vehicle}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{r.type}</p>
        </div>
      ),
    },
    { key: "owner", label: "Owner" },
    { key: "year", label: "Year" },
    { key: "fuel", label: "Fuel" },
    {
      key: "insured",
      label: "Insurance",
      render: (r) => (
        <span
          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
            r.insured === "Insured"
              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          }`}
        >
          {r.insured}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          {user.canWrite && (<button
            onClick={() => openEdit(vehicles.find((v) => v.id === r.id))}
            title="Edit"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
          >
            <Pencil className="h-4 w-4" />
          </button>)}
          {user.canDelete && (<button
            onClick={() => setDeleting(vehicles.find((v) => v.id === r.id))}
            title="Delete"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>)}
        </div>
      ),
    },
  ];

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter(
      (r) => (type === "all" || r.type === type) && (!t || [r.regNo, r.vehicle, r.owner, r.fuel].some((x) => String(x || "").toLowerCase().includes(t)))
    );
  }, [rows, query, type]);

  const TypeIcon = ({ t, className }) => (t === "Two-Wheeler" ? <Bike className={className} /> : t === "Commercial" ? <Truck className={className} /> : <Car className={className} />);

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" subtitle="Every insured and uninsured vehicle in one garage.">
        {user.canWrite && <button onClick={openAdd} className={btnPrimary}><Plus className="h-4 w-4" /> Add Vehicle</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Vehicles" value={vehicles.length} icon={Car} color="blue" note={`${insuredCount} currently insured`} />
        <StatCard title="Cars" value={count("Car")} icon={Car} color="green" note="Private cars" />
        <StatCard title="Two-Wheelers" value={count("Two-Wheeler")} icon={Bike} color="amber" note="Bikes and scooters" />
        <StatCard title="Commercial" value={count("Commercial")} icon={Truck} color="purple" note="Goods and passenger" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox value={query} onChange={(v) => { setQuery(v); setShown(12); }} placeholder="Search reg. no., model, owner" />
        <div className="flex items-center justify-between gap-3">
          <FilterChips
            value={type}
            onChange={(v) => { setType(v); setShown(12); }}
            options={[
              { value: "all", label: "All", count: vehicles.length },
              { value: "Car", label: "Cars", count: count("Car") },
              { value: "Two-Wheeler", label: "Two-Wheelers", count: count("Two-Wheeler") },
              { value: "Commercial", label: "Commercial", count: count("Commercial") },
            ]}
          />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState icon={Car} title="Your garage is empty" text={customers.length ? "Add a vehicle for one of your customers." : "Add a customer first, then register their vehicle."} action={customers.length ? <button onClick={openAdd} className={btnPrimary}><Plus className="h-4 w-4" /> Add Vehicle</button> : null} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Car} title="No match" text="Try a different search or filter." />
      ) : view === "list" ? (
        <DataTable key={query + type} columns={columns} data={filtered} pageSize={8} searchable={false} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, shown).map((v) => {
              const insured = v.insured === "Insured";
              return (
                <div key={v.id} className="group animate-fade-up overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-gold-500/40">
                  <div className="bg-luxe pattern-dots relative flex items-center justify-between p-5">
                    <TypeIcon t={v.type} className="h-12 w-12 text-gold-600 dark:text-gold-300" />
                    {/* Number plate */}
                    <div className="rounded-lg border-2 border-gray-900 bg-gradient-to-b from-gray-50 to-gray-200 px-3 py-1.5 shadow-lg">
                      <p className="font-mono text-sm font-extrabold tracking-[0.15em] text-gray-900">{v.regNo}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-bold text-gray-900 dark:text-white">{v.vehicle}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{v.type}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${insured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>
                        {insured ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />} {v.insured}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-slate-800/60"><Calendar className="mx-auto mb-1 h-4 w-4 text-gold-600" /><p className="font-semibold text-gray-900 dark:text-white">{v.year}</p></div>
                      <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-slate-800/60"><Fuel className="mx-auto mb-1 h-4 w-4 text-gold-600" /><p className="font-semibold text-gray-900 dark:text-white">{v.fuel}</p></div>
                      <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-slate-800/60"><User className="mx-auto mb-1 h-4 w-4 text-gold-600" /><p className="truncate font-semibold text-gray-900 dark:text-white">{v.owner.split(" ")[0]}</p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
                      <p className="truncate text-xs text-gray-500 dark:text-slate-400">Owner: {v.owner}</p>
                      <div className="flex gap-1">
                        {user.canWrite && <button onClick={() => openEdit(vehicles.find((x) => x.id === v.id))} title="Edit" className={iconAction}><Pencil className="h-4 w-4" /></button>}
                        {user.canDelete && <button onClick={() => setDeleting(vehicles.find((x) => x.id === v.id))} title="Delete" className={iconAction}><Trash2 className="h-4 w-4" /></button>}
                      </div>
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

      {/* Add / Edit */}
      <Modal open={formOpen} onClose={closeForm} title={editing ? "Edit Vehicle" : "Add New Vehicle"}>
        <VehicleForm
          key={editing ? editing.id : "new"}
          initial={editing}
          customers={customers}
          existing={vehicles}
          onSave={handleSave}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Vehicle">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-300">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {deleting?.make} {deleting?.model} ({deleting?.regNo})
              </span>
              ? This action cannot be undone.
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

export default VehiclesPage;