import { useState } from "react";

const empty = { name: "", phone: "", email: "", city: "", kyc: "Pending" };

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// initial: customer object when editing, null when adding
function CustomerForm({ initial, existing = [], onSave, onCancel }) {
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Name is required";
    if (!/^\d{10}$/.test(form.phone)) err.phone = "Phone must be exactly 10 digits";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = "Enter a valid email address";
    if (!form.city.trim()) err.city = "City is required";
        const others = existing.filter((c) => c.id !== initial?.id);
    if (!err.phone && others.some((c) => c.phone === form.phone)) {
      err.phone = "This phone number is already registered";
    }
    if (
      !err.email &&
      others.some((c) => (c.email || "").toLowerCase() === form.email.trim().toLowerCase())
    ) {
      err.email = "This email is already registered";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full Name" error={errors.name}>
        <input value={form.name} onChange={set("name")} placeholder="e.g. Ramesh Sharma" className={inputCls} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone" error={errors.phone}>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="10-digit number"
            className={inputCls}
          />
        </Field>
        <Field label="City" error={errors.city}>
          <input value={form.city} onChange={set("city")} placeholder="e.g. Haldwani" className={inputCls} />
        </Field>
      </div>

      <Field label="Email" error={errors.email}>
        <input type="email" value={form.email} onChange={set("email")} placeholder="name@example.com" className={inputCls} />
      </Field>

      <Field label="KYC Status">
        <select value={form.kyc} onChange={set("kyc")} className={inputCls}>
          <option>Pending</option>
          <option>Verified</option>
          <option>Rejected</option>
        </select>
      </Field>

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
          {initial ? "Save Changes" : "Add Customer"}
        </button>
      </div>
    </form>
  );
}

export default CustomerForm;