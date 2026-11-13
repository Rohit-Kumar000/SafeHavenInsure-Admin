import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Printer, AlertTriangle } from "lucide-react";
import Field from "../components/common/Field";
import PremiumBreakdown from "../components/common/PremiumBreakdown";
import PageHeader from "../components/common/PageHeader";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost, card } from "../components/common/ui";
import { NCB_SLABS, addDays, calcPremium, fmtDate, inr, policyEnd, todayISO } from "../utils/helpers";
import { certificateHtml, printDocument } from "../utils/documents";

const MODES = ["UPI", "Card", "Net Banking", "Cash"];

function NewPolicyPage() {
  const { customers, vehicles, policies, plans, settings, issuePolicy } = useData();
  const today = todayISO();

  const initial = {
    customerId: "", vehicleId: "", planId: "", addonIds: [],
    idv: "", ncb: "0", startDate: today, payStatus: "Paid", payMode: "UPI",
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [issued, setIssued] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const customer = customers.find((c) => c.id === form.customerId);
  const myVehicles = vehicles.filter((v) => v.customerId === form.customerId);
  const vehicle = vehicles.find((v) => v.id === form.vehicleId);
  const basePlans = plans.filter((p) => p.kind === "Base" && p.active);
  const addonPlans = plans.filter((p) => p.kind === "Add-on" && p.active);
  const plan = plans.find((p) => p.id === form.planId);
  const needsOD = !!plan?.includesOD;
  const chosenAddons = needsOD ? addonPlans.filter((a) => form.addonIds.includes(a.id)) : [];

  const calc =
    plan && vehicle
      ? calcPremium({ plan, addons: chosenAddons, vehicleType: vehicle.type, idv: form.idv, ncb: form.ncb, settings })
      : null;

  const endDate = form.startDate ? policyEnd(form.startDate) : "";

  const toggleAddon = (id) =>
    set("addonIds", form.addonIds.includes(id) ? form.addonIds.filter((x) => x !== id) : [...form.addonIds, id]);

  const submit = () => {
    const err = {};
    if (!customer) err.customerId = "Select a customer";
    else if (customer.kyc === "Rejected") err.customerId = "KYC of this customer is rejected, so a policy cannot be issued";
    if (!vehicle) err.vehicleId = "Select a vehicle";
    if (!plan) err.planId = "Select a plan";

    let idvNum = null;
    if (needsOD) {
      idvNum = Number(form.idv);
      if (!Number.isFinite(idvNum) || idvNum < 10000 || idvNum > 50000000) err.idv = "Enter an IDV between ₹10,000 and ₹5,00,00,000";
    }
    if (!form.startDate || form.startDate < today || form.startDate > addDays(today, 60)) {
      err.startDate = "Start date must be between today and the next 60 days";
    }

    if (!err.vehicleId && !err.planId && !err.startDate && vehicle && plan) {
      const end = policyEnd(form.startDate);
      const clash = policies.find((p) => {
        if (p.status === "Cancelled" || p.vehicleId !== vehicle.id) return false;
        if (p.startDate > end || p.endDate < form.startDate) return false;
        const ep = plans.find((x) => x.id === p.planId) ?? plans.find((x) => x.name === p.plan);
        if (!ep) return true;
        return (ep.includesTP && plan.includesTP) || (ep.includesOD && plan.includesOD);
      });
      if (clash) err.vehicleId = `${vehicle.regNo} already has policy ${clash.id} (${clash.plan}) valid until ${fmtDate(clash.endDate)}`;
    }

    setErrors(err);
    if (Object.keys(err).length || !calc) return;

    const policy = issuePolicy(
      {
        customerId: customer.id,
        vehicleId: vehicle.id,
        planId: plan.id,
        plan: plan.name,
        addons: chosenAddons.map((a) => a.name),
        idv: needsOD ? idvNum : null,
        ncb: needsOD ? Number(form.ncb) : 0,
        netPremium: calc.net,
        gst: calc.gst,
        premium: calc.total,
        startDate: form.startDate,
        endDate: policyEnd(form.startDate),
        status: "Active",
        issuedOn: today,
      },
      { mode: form.payStatus === "Paid" ? form.payMode : "", status: form.payStatus }
    );
    setIssued({ ...policy, status: form.startDate > today ? "Upcoming" : "Active" });
  };

  // ---------- success screen ----------
  if (issued) {
    const c = customers.find((x) => x.id === issued.customerId);
    const v = vehicles.find((x) => x.id === issued.vehicleId);
    const pl = plans.find((x) => x.id === issued.planId);
    return (
      <div className="mx-auto max-w-xl">
        <div className={`${card} text-center`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Policy issued</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Policy <span className="font-semibold text-gray-900 dark:text-white">{issued.id}</span> for {c?.name} ({v?.regNo}) is created.
            Premium {inr(issued.premium)} · {form.payStatus === "Paid" ? "payment recorded" : "payment pending"}.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => printDocument(`Policy ${issued.id}`, certificateHtml({ policy: issued, customer: c, vehicle: v, plan: pl, company: settings.company }))}
              className={btnGhost}
            >
              <Printer className="h-4 w-4" /> Print Certificate
            </button>
            <Link to={`/policies?q=${issued.id}`} className={btnGhost}>View Policy</Link>
            <button onClick={() => { setForm(initial); setErrors({}); setIssued(null); }} className={btnPrimary}>
              Issue Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Policy" subtitle="Choose the customer, vehicle and plan. The premium is calculated automatically." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Customer and vehicle */}
          <div className={card}>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">1. Customer and vehicle</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Customer" error={errors.customerId}>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, vehicleId: "" }))}
                  className={inputCls}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </Field>
              <Field label="Vehicle" error={errors.vehicleId}>
                <select
                  value={form.vehicleId}
                  onChange={(e) => set("vehicleId", e.target.value)}
                  disabled={!customer}
                  className={inputCls}
                >
                  <option value="">{customer ? "Select vehicle" : "Select a customer first"}</option>
                  {myVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.regNo} · {v.make} {v.model}</option>
                  ))}
                </select>
              </Field>
            </div>
            {customer?.kyc === "Pending" && (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> KYC of this customer is still pending. Verify it from the Customers page.
              </p>
            )}
            {customer && myVehicles.length === 0 && (
              <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                This customer has no vehicles yet. <Link to="/vehicles" className="font-medium text-blue-700 hover:underline dark:text-blue-400">Add a vehicle</Link> first.
              </p>
            )}
            {vehicle && (
              <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                {vehicle.type} · {vehicle.year} · {vehicle.fuel}
              </p>
            )}
          </div>

          {/* 2. Plan and cover */}
          <div className={card}>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">2. Plan and cover</h3>
            {errors.planId && <p className="mb-2 text-xs text-red-500">{errors.planId}</p>}
            {basePlans.length === 0 ? (
              <p className="text-sm text-gray-500">No active plans. Enable a plan on the Policy Plans page.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {basePlans.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => set("planId", p.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      form.planId === p.id
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-500/10"
                        : "border-gray-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-500"
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {[p.includesTP && "Third party", p.includesOD && "Own damage"].filter(Boolean).join(" + ")}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {needsOD && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="IDV (Insured Declared Value)" error={errors.idv} hint="Current market value of the vehicle">
                  <input
                    value={form.idv}
                    onChange={(e) => set("idv", e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="e.g. 450000"
                    className={inputCls}
                  />
                </Field>
                <Field label="No Claim Bonus (NCB)" hint="Applies to the own-damage premium only">
                  <select value={form.ncb} onChange={(e) => set("ncb", e.target.value)} className={inputCls}>
                    {NCB_SLABS.map((n) => (
                      <option key={n} value={n}>{n}%</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {needsOD && addonPlans.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">Add-ons (optional)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {addonPlans.map((a) => (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                        form.addonIds.includes(a.id)
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-500/10"
                          : "border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.addonIds.includes(a.id)}
                        onChange={() => toggleAddon(a.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-700"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">{a.name}</span>
                        <span className="block text-xs text-gray-500 dark:text-slate-400">{a.rate}% of IDV</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {plan && !needsOD && (
              <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
                IDV, NCB and add-ons apply only to plans that include own damage.
              </p>
            )}
          </div>

          {/* 3. Period and payment */}
          <div className={card}>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">3. Policy period and payment</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Start Date" error={errors.startDate}>
                <input type="date" min={today} max={addDays(today, 60)} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="End Date" hint="1 year from the start date">
                <input value={endDate ? fmtDate(endDate) : ""} disabled className={inputCls} />
              </Field>
              <Field label="Payment">
                <select value={form.payStatus} onChange={(e) => set("payStatus", e.target.value)} className={inputCls}>
                  <option value="Paid">Paid now</option>
                  <option value="Pending">Pay later</option>
                </select>
              </Field>
            </div>
            {form.payStatus === "Paid" && (
              <div className="mt-4 sm:w-1/3">
                <Field label="Payment Mode">
                  <select value={form.payMode} onChange={(e) => set("payMode", e.target.value)} className={inputCls}>
                    {MODES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className={`${card} lg:sticky lg:top-4`}>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Premium summary</h3>
            {plan && (
              <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
                {plan.name}{chosenAddons.length ? ` + ${chosenAddons.length} add-on${chosenAddons.length > 1 ? "s" : ""}` : ""}
                {vehicle ? ` · ${vehicle.regNo}` : ""}
              </p>
            )}
            <PremiumBreakdown calc={calc} />
            <button onClick={submit} disabled={!calc} className={`${btnPrimary} mt-5 w-full`}>
              Issue Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewPolicyPage;