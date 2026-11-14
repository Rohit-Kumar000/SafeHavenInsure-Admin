import { fmtDate, inr } from "./helpers";

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const css = `
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#261C12;margin:0;padding:32px;font-size:13px}
h1{font-size:22px;margin:0}
h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #DDBB78;padding-bottom:4px}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C8792C;padding-bottom:12px}
.muted{color:#6D563D}.right{text-align:right}
table{width:100%;border-collapse:collapse}
td,th{padding:7px 8px;border:1px solid #E6C98A;text-align:left;vertical-align:top}
th{background:#FBF0D6;width:32%}
.total td,.total th{font-weight:bold;background:#FAF0DA}
.badge{display:inline-block;padding:2px 10px;border-radius:99px;background:#dcfce7;color:#166534;font-weight:bold;font-size:12px}
ul{margin:6px 0;padding-left:18px}
.foot{margin-top:28px;font-size:11px;color:#6D563D}
`;

export function printDocument(title, body) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`
  );
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 300);
}

const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;

function header(company, title, number) {
  const lines = [company.address, [company.phone, company.email].filter(Boolean).join(" | "), company.regNo && `Reg. No: ${company.regNo}`]
    .filter(Boolean)
    .map((l) => `<div class="muted">${esc(l)}</div>`)
    .join("");
  return `<div class="head"><div><h1>${esc(company.name)}</h1>${lines}</div>
  <div class="right"><div style="font-size:16px;font-weight:bold">${esc(title)}</div><div>${esc(number)}</div></div></div>`;
}

export function certificateHtml({ policy, customer, vehicle, plan, company }) {
  const money =
    policy.netPremium != null
      ? row("Net Premium", inr(policy.netPremium)) + row("GST", inr(policy.gst)) + `<tr class="total"><th>Total Premium</th><td>${esc(inr(policy.premium))}</td></tr>`
      : `<tr class="total"><th>Total Premium</th><td>${esc(inr(policy.premium))}</td></tr>`;
  const features = (plan?.features || []).map((f) => `<li>${esc(f)}</li>`).join("");
  return `${header(company, "Motor Insurance Policy Certificate", policy.id)}
  <h2>Policyholder</h2><table>${row("Name", customer?.name)}${row("Phone", customer?.phone)}${row("Email", customer?.email)}${row("City", customer?.city)}</table>
  <h2>Insured Vehicle</h2><table>${row("Registration No.", vehicle?.regNo)}${row("Make / Model", `${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`)}${row("Year", vehicle?.year)}${row("Fuel", vehicle?.fuel)}${row("Type", vehicle?.type)}</table>
  <h2>Policy Details</h2><table>
    ${row("Plan", policy.plan)}
    ${policy.addons?.length ? row("Add-ons", policy.addons.join(", ")) : ""}
    ${policy.idv ? row("Insured Declared Value", inr(policy.idv)) : ""}
    ${policy.ncb ? row("No Claim Bonus", `${policy.ncb}%`) : ""}
    ${row("Policy Period", `${fmtDate(policy.startDate)} to ${fmtDate(policy.endDate)}`)}
    ${money}
    <tr><th>Status</th><td><span class="badge">${esc(policy.status)}</span></td></tr>
  </table>
  ${features ? `<h2>Coverage</h2><ul>${features}</ul>` : ""}
  <div class="foot">This is a system generated certificate. Issued on ${esc(fmtDate(policy.issuedOn || policy.startDate))}.</div>`;
}

export function receiptHtml({ payment, policy, customer, vehicle, company }) {
  return `${header(company, "Premium Payment Receipt", payment.id)}
  <h2>Received From</h2><table>${row("Customer", customer?.name)}${row("Phone", customer?.phone)}</table>
  <h2>Payment Details</h2><table>
    ${row("Policy No.", payment.policyId)}
    ${row("Plan", policy?.plan ?? "-")}
    ${row("Vehicle", vehicle ? `${vehicle.regNo} (${vehicle.make} ${vehicle.model})` : "-")}
    ${row("Payment Date", fmtDate(payment.date))}
    ${row("Payment Mode", payment.mode || "-")}
    <tr class="total"><th>Amount Paid</th><td>${esc(inr(payment.amount))}</td></tr>
    <tr><th>Status</th><td><span class="badge">${esc(payment.status)}</span></td></tr>
  </table>
  <div class="foot">This is a system generated receipt and does not need a signature.</div>`;
}