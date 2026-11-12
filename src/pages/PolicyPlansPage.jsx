import { useState } from "react";
import { Layers, Puzzle, CheckCircle2, FileText, Plus, Pencil, Trash2, Check } from "lucide-react";
import StatCard from "../components/common/StatCard";
import Modal from "../components/common/Modal";
import Confirm from "../components/common/Confirm";
import Field from "../components/common/Field";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost, card, iconAction } from "../components/common/ui";

const emptyForm = { name: "", kind: "Base", description: "", includesTP: true, includesOD: true, rate: "", features: "" };

function PlanForm({ initial, locked, others, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          kind: initial.kind,
          description: initial.description || "",
          includesTP: !!initial.includesTP,
          includesOD: !!initial.includesOD,
          rate: initial.rate ? String(initial.rate) : "",
          features: (initial.features || []).join("\n"),
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isBase = form.kind === "Base";

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    const name = form.name.trim();
    if (!name) err.name = "Plan name is required";
    else if (others.some((p) => p.name.toLowerCase() === name.toLowerCase())) err.name = "A plan with this name already exists";
    if (!form.description.trim()) err.description = "Description is required";
    if (isBase && !form.includesTP && !form.includesOD) err.cover = "Select at least one cover";
    const rate = Number(form.rate);
    if (!isBase && !(rate > 0 && rate <= 10)) err.rate = "Enter a rate between 0.01 and 10";
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({
      name,
      kind: form.kind,
      description: form.description.trim(),
      includesTP: isBase && form.includesTP,
      includesOD: isBase && form.includesOD,
      rate: isBase ? 0 : rate,
      features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Plan Name" error={errors.name} hint={locked ? "Name and type cannot be changed because policies use this plan" : undefined}>
          <input value={form.name} onChange={set("name")} disabled={locked} placeholder="e.g. Comprehensive" className={inputCls} />
        </Field>
        <Field label="Type">
          <select value={form.kind} onChange={set("kind")} disabled={locked} className={inputCls}>
            <option value="Base">Base plan</option>
            <option value="Add-on">Add-on</option>
          </select>
        </Field>
      </div>

      <Field label="Description" error={errors.description}>
        <textarea rows={2} value={form.description} onChange={set("description")} className={inputCls} />
      </Field>

      {isBase ? (
        <Field label="Cover included" error={errors.cover}>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-300">
            {[["includesTP", "Third-party liability"], ["includesOD", "Own damage"]].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-700"
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
      ) : (
        <Field label="Rate (% of IDV)" error={errors.rate} hint="Add-on premium = IDV x this rate. Only sold with plans that include own damage.">
          <input
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value.replace(/[^\d.]/g, "") })}
            placeholder="e.g. 0.4"
            className={inputCls}
          />
        </Field>
      )}

      <Field label="Features" hint="One feature per line">
        <textarea rows={4} value={form.features} onChange={set("features")} className={inputCls} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        <button type="submit" className={btnPrimary}>{initial ? "Save Changes" : "Add Plan"}</button>
      </div>
    </form>
  );
}

function PlanCard({ plan, used, settings, onToggle, onEdit, onDelete }) {
  const { user } = useAuth();
  const isBase = plan.kind === "Base";
  return (
    <div className={`${card} flex flex-col ${plan.active ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {isBase && plan.includesTP && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-400">Third party</span>
            )}
            {isBase && plan.includesOD && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">Own damage</span>
            )}
            {!isBase && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">Add-on</span>
            )}
          </div>
        </div>
        <button
          role="switch"
          aria-checked={plan.active}
          title={plan.active ? "Active: click to disable" : "Disabled: click to enable"}
          onClick={onToggle}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${plan.active ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${plan.active ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">{plan.description}</p>

      <div className="mt-3 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
        {isBase && plan.includesTP && (
          <p>Third-party premium: Car ₹{settings.tpRates.Car.toLocaleString("en-IN")} · 2W ₹{settings.tpRates["Two-Wheeler"].toLocaleString("en-IN")} · CV ₹{settings.tpRates.Commercial.toLocaleString("en-IN")}</p>
        )}
        {isBase && plan.includesOD && (
          <p>Own-damage rate: Car {settings.odRates.Car}% · 2W {settings.odRates["Two-Wheeler"]}% · CV {settings.odRates.Commercial}% of IDV</p>
        )}
        {!isBase && <p>Adds {plan.rate}% of IDV to the premium</p>}
      </div>

      {plan.features?.length > 0 && (
        <ul className="mt-3 flex-1 space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
        <span className="text-xs text-gray-500 dark:text-slate-400">
          {used} {used === 1 ? "policy" : "policies"} · {plan.active ? "Active" : "Disabled"}
        </span>
        {user.canConfigure && <div className="flex">
          <button onClick={onEdit} title="Edit" className={iconAction}><Pencil className="h-4 w-4" /></button>
          <button onClick={onDelete} title="Delete" className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>}
      </div>
    </div>
  );
}

function PolicyPlansPage() {
  const { plans, policies, settings, addPlan, updatePlan, deletePlan } = useData();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const usedBy = (plan) => policies.filter((p) => p.planId === plan.id || p.plan === plan.name || p.addons?.includes(plan.name)).length;

  const base = plans.filter((p) => p.kind === "Base");
  const addons = plans.filter((p) => p.kind === "Add-on");

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const save = (data) => {
    if (editing) updatePlan(editing.id, data);
    else addPlan({ ...data, active: true });
    closeForm();
  };

  const deleteBlocked = deleting ? usedBy(deleting) > 0 : false;

  return (
    <div className="space-y-6">
      <PageHeader title="Policy Plans" subtitle="Plans and add-ons you sell. Disabled plans cannot be used for new policies.">
        {user.canConfigure && <button onClick={openAdd} className={btnPrimary}><Plus className="h-4 w-4" /> Add Plan</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Base Plans" value={base.length} icon={Layers} color="blue" note="Third party, comprehensive..." />
        <StatCard title="Add-ons" value={addons.length} icon={Puzzle} color="purple" note="Optional extra cover" />
        <StatCard title="Active Plans" value={plans.filter((p) => p.active).length} icon={CheckCircle2} color="green" note={`of ${plans.length} total`} />
        <StatCard title="Policies Issued" value={policies.length} icon={FileText} color="amber" note="Across all plans" />
      </div>

      <section>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Base Plans</h3>
        {base.length === 0 ? (
          <p className="text-sm text-gray-400">No base plans yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {base.map((p) => (
              <PlanCard key={p.id} plan={p} used={usedBy(p)} settings={settings}
                onToggle={() => updatePlan(p.id, { active: !p.active })}
                onEdit={() => openEdit(p)} onDelete={() => setDeleting(p)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Add-ons</h3>
        {addons.length === 0 ? (
          <p className="text-sm text-gray-400">No add-ons yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {addons.map((p) => (
              <PlanCard key={p.id} plan={p} used={usedBy(p)} settings={settings}
                onToggle={() => updatePlan(p.id, { active: !p.active })}
                onEdit={() => openEdit(p)} onDelete={() => setDeleting(p)} />
            ))}
          </div>
        )}
      </section>

      <Modal open={formOpen} onClose={closeForm} title={editing ? "Edit Plan" : "Add New Plan"} size="lg">
        <PlanForm
          key={editing ? editing.id : "new"}
          initial={editing}
          locked={editing ? usedBy(editing) > 0 : false}
          others={plans.filter((p) => p.id !== editing?.id)}
          onSave={save}
          onCancel={closeForm}
        />
      </Modal>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Plan"
        danger
        confirmLabel="Delete"
        disabled={deleteBlocked}
        onConfirm={() => { deletePlan(deleting.id); setDeleting(null); }}
        message={
          deleteBlocked
            ? `${deleting?.name} is used by ${usedBy(deleting)} policies, so it cannot be deleted. Disable it instead and it will not be offered for new policies.`
            : `Are you sure you want to delete ${deleting?.name}? This cannot be undone.`
        }
      />
    </div>
  );
}

export default PolicyPlansPage;