import { useState } from "react";

const empty = {
  customerId: "",
  regNo: "",
  make: "",
  model: "",
  year: "",
  fuel: "Petrol",
  type: "Car",
};

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// initial: vehicle when editing, null when adding
function VehicleForm({ initial, customers, existing = [], onSave, onCancel }) {
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});
  const maxYear = new Date().getFullYear() + 1;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validate = () => {
    const err = {};
    const reg = form.regNo.replace(/\s|-/g, "").toUpperCase();

    if (!form.customerId) err.customerId = "Select the vehicle owner";
    if (!/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(reg)) {
      err.regNo = "Enter a valid number, e.g. UK04AB1234";
    } else if (
      existing.some((v) => v.id !== initial?.id && v.regNo.toUpperCase() === reg)
    ) {
      err.regNo = "This registration number already exists";
    }
    if (!form.make.trim()) err.make = "Make is required";
    if (!form.model.trim()) err.model = "Model is required";
    const y = Number(form.year);
    if (!Number.isInteger(y) || y < 1990 || y > maxYear) {
      err.year = `Enter a year between 1990 and ${maxYear}`;
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      customerId: form.customerId,
      regNo: form.regNo.replace(/\s|-/g, "").toUpperCase(),
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      fuel: form.fuel,
      type: form.type,
    });
  };

  if (customers.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-slate-300">
          You need at least one customer before adding a vehicle. Please add a customer first.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Owner"
        error={errors.customerId}
        hint={initial ? "Owner cannot be changed after the vehicle is added" : undefined}
      >
        <select
          value={form.customerId}
          onChange={set("customerId")}
          disabled={!!initial}
          className={inputCls}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Registration Number" error={errors.regNo}>
        <input
          value={form.regNo}
          onChange={(e) => setForm({ ...form, regNo: e.target.value.toUpperCase() })}
          placeholder="e.g. UK04AB1234"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Make" error={errors.make}>
          <input value={form.make} onChange={set("make")} placeholder="e.g. Maruti" className={inputCls} />
        </Field>
        <Field label="Model" error={errors.model}>
          <input value={form.model} onChange={set("model")} placeholder="e.g. Swift" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Year" error={errors.year}>
          <input
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="e.g. 2022"
            className={inputCls}
          />
        </Field>
        <Field label="Fuel">
          <select value={form.fuel} onChange={set("fuel")} className={inputCls}>
            <option>Petrol</option>
            <option>Diesel</option>
            <option>CNG</option>
            <option>Electric</option>
          </select>
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={set("type")} className={inputCls}>
            <option>Car</option>
            <option>Two-Wheeler</option>
            <option>Commercial</option>
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700"
        >
          {initial ? "Save Changes" : "Add Vehicle"}
        </button>
      </div>
    </form>
  );
}

export default VehicleForm;