export const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export function parseISO(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// One year policy: 5 Nov 2026 -> 4 Nov 2027
export function policyEnd(start) {
  const d = parseISO(start);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

// Days from date a to date b (negative if b is before a)
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

export function fmtDate(s) {
  if (!s) return "-";
  return parseISO(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Status is always calculated from dates (only "Cancelled" is stored)
export function policyStatus(p) {
  if (p.status === "Cancelled") return "Cancelled";
  const t = todayISO();
  if (p.endDate < t) return "Expired";
  if (p.startDate > t) return "Upcoming";
  return "Active";
}

export const NCB_SLABS = [0, 20, 25, 35, 45, 50];
export const nextNcb = (cur) => {
  const i = NCB_SLABS.indexOf(Number(cur) || 0);
  return NCB_SLABS[Math.min(i < 0 ? 0 : i + 1, NCB_SLABS.length - 1)];
};

// Premium = third party + (IDV x OD rate - NCB) + add-ons, then GST
export function calcPremium({ plan, addons = [], vehicleType, idv, ncb, settings }) {
  const idvNum = Number(idv) || 0;
  const hasOD = !!plan?.includesOD;
  const tp = plan?.includesTP ? Math.round(Number(settings.tpRates[vehicleType]) || 0) : 0;
  const odBase = hasOD ? Math.round((idvNum * (Number(settings.odRates[vehicleType]) || 0)) / 100) : 0;
  const ncbPct = hasOD ? Number(ncb) || 0 : 0;
  const ncbAmt = Math.round((odBase * ncbPct) / 100);
  const od = odBase - ncbAmt;
  const addonItems = hasOD
    ? addons.map((a) => ({ name: a.name, amount: Math.round((idvNum * a.rate) / 100) }))
    : [];
  const addonTotal = addonItems.reduce((s, a) => s + a.amount, 0);
  const net = tp + od + addonTotal;
  const gstRate = Number(settings.gstRate) || 0;
  const gst = Math.round((net * gstRate) / 100);
  return { tp, odBase, ncbPct, ncbAmt, od, addonItems, addonTotal, net, gstRate, gst, total: net + gst };
}

function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
  saveBlob(filename, new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}

export function downloadJSON(filename, obj) {
  saveBlob(filename, new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
}

// Writes one sheet per data group into a single .xlsx file.
export async function downloadExcel(filename, groups) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  Object.entries(groups).forEach(([name, value]) => {
    const rows = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    if (!rows.length) return;
    const flat = rows.map((r) => Object.fromEntries(
      Object.entries(r).filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, v !== null && typeof v === "object" ? JSON.stringify(v) : v])
    ));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
