// Usage: npm run setup:appwrite
// Creates the database, collections, permissions, storage bucket, staff function, and first Super Admin.
// Safe to rerun: existing resources are skipped or updated.
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------- Read environment variables ----------
const env = { ...process.env };
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const ENDPOINT = env.VITE_APPWRITE_ENDPOINT;
const PROJECT = env.VITE_APPWRITE_PROJECT_ID;
const KEY = env.APPWRITE_API_KEY;
const DB = env.VITE_APPWRITE_DATABASE_ID || "safehaven";
const BUCKET = env.VITE_APPWRITE_BUCKET_ID || "media";
const FN = env.VITE_APPWRITE_FUNCTION_ID || "staff";
const OWNER_EMAIL = (env.OWNER_EMAIL || "").trim();
const OWNER_PASSWORD = env.OWNER_PASSWORD || "";
const OWNER_NAME = env.OWNER_NAME || "Super Admin";

if (!ENDPOINT || !PROJECT || !KEY || KEY.startsWith("your_")) {
  console.error("\nSet VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in .env, then run the command again.\n");
  process.exit(1);
}

const headers = { "X-Appwrite-Project": PROJECT, "X-Appwrite-Key": KEY };

async function api(method, path, body) {
  const res = await fetch(ENDPOINT + path, {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) {
    const err = new Error(data.message || res.statusText);
    err.code = res.status;
    throw err;
  }
  return data;
}

async function exists(path) {
  try {
    await api("GET", path);
    return true;
  } catch (e) {
    if (e.code === 404) return false;
    throw e;
  }
}

async function ensure(label, fn) {
  try {
    await fn();
    console.log("  + " + label);
  } catch (e) {
    if (e.code === 409) console.log("  = " + label + " (already exists)");
    else {
      console.error("  ! " + label + " -> " + e.message);
      throw e;
    }
  }
}

// ---------- Roles and permissions ----------
const SUPER = "label:superadmin";
const ADMIN = "label:admin";
const EMP = "label:employee";
const P = (action, roles) => roles.map((r) => `${action}("${r}")`);
const perms = ({ read = [], create = [], update = [], del = [] }) => [...P("read", read), ...P("create", create), ...P("update", update), ...P("delete", del)];

// Business data is readable by all staff; only Super Admins and Employees can write, and only Super Admins can delete.
const DATA_PERMS = perms({ read: [SUPER, ADMIN, EMP], create: [SUPER, EMP], update: [SUPER, EMP], del: [SUPER] });
// Plans and settings are readable by all staff but editable only by Super Admins.
const CONFIG_PERMS = perms({ read: [SUPER, ADMIN, EMP], create: [SUPER], update: [SUPER], del: [SUPER] });

const S = (key, size = 255) => ({ type: "string", key, size });
const F = (key) => ({ type: "float", key, min: -1e12, max: 1e12 });
const I = (key) => ({ type: "integer", key, min: -2147483647, max: 2147483647 });
const B = (key) => ({ type: "boolean", key });

const ACTIVITY_ATTRS = [S("userId", 36), S("userName", 100), S("role", 20), S("action", 40), S("entity", 40), S("entityId", 40), S("summary", 300)];
const ACTIVITY_IDX = [["idx_user", "key", ["userId"]], ["idx_action", "key", ["action"]]];

const collections = [
  { id: "customers", name: "Customers", perms: DATA_PERMS,
    attrs: [S("name"), S("phone", 20), S("email"), S("city"), S("kyc", 20)],
    indexes: [["idx_phone", "key", ["phone"]], ["idx_kyc", "key", ["kyc"]]] },
  { id: "vehicles", name: "Vehicles", perms: DATA_PERMS,
    attrs: [S("customerId", 36), S("regNo", 20), S("make", 60), S("model", 60), I("year"), S("fuel", 20), S("type", 20)],
    indexes: [["idx_customer", "key", ["customerId"]], ["idx_regno", "key", ["regNo"]]] },
  { id: "plans", name: "Plans", perms: CONFIG_PERMS,
    attrs: [S("name", 80), S("kind", 20), S("description", 600), B("includesTP"), B("includesOD"), F("rate"), B("active"), S("features", 4000)],
    indexes: [["idx_kind", "key", ["kind"]]] },
  { id: "policies", name: "Policies", perms: DATA_PERMS,
    attrs: [
      S("customerId", 36), S("vehicleId", 36), S("planId", 36), S("plan", 80), S("addons", 2000),
      F("idv"), I("ncb"), F("netPremium"), F("gst"), F("premium"),
      S("startDate", 10), S("endDate", 10), S("status", 20), S("issuedOn", 10),
      S("renewedFrom", 36), S("renewedBy", 36), S("cancelledOn", 10), S("cancelReason", 500),
    ],
    indexes: [["idx_customer", "key", ["customerId"]], ["idx_vehicle", "key", ["vehicleId"]], ["idx_end", "key", ["endDate"]]] },
  { id: "claims", name: "Claims", perms: DATA_PERMS,
    attrs: [
      S("policyId", 36), S("customerId", 36), S("type", 60), F("amount"), F("approvedAmount"),
      S("incidentDate", 10), S("date", 10), S("status", 20), S("description", 1500), S("history", 3000), S("remarks", 500), S("settledOn", 10),
    ],
    indexes: [["idx_policy", "key", ["policyId"]], ["idx_status", "key", ["status"]]] },
  { id: "payments", name: "Payments", perms: DATA_PERMS,
    attrs: [S("policyId", 36), S("customerId", 36), F("amount"), S("date", 10), S("mode", 20), S("status", 20)],
    indexes: [["idx_policy", "key", ["policyId"]], ["idx_status", "key", ["status"]]] },
  { id: "settings", name: "Settings", perms: CONFIG_PERMS, attrs: [S("data", 20000)], indexes: [] },

  // Keep separate activity collections so access is enforced by role-level permissions:
  //   Super Admin activity -> Super Admin only
  //   Admin activity -> Super Admin only
  //   Employee activity -> Super Admin and Admin
  // Document security is on so every person can also read their own activity entries.
  { id: "activity_super", name: "Activity (Super Admin)", docSec: true, perms: perms({ read: [SUPER], create: [SUPER] }), attrs: ACTIVITY_ATTRS, indexes: ACTIVITY_IDX },
  { id: "activity_admin", name: "Activity (Admin)", docSec: true, perms: perms({ read: [SUPER], create: [ADMIN] }), attrs: ACTIVITY_ATTRS, indexes: ACTIVITY_IDX },
  { id: "activity_employee", name: "Activity (Employee)", docSec: true, perms: perms({ read: [SUPER, ADMIN], create: [EMP] }), attrs: ACTIVITY_ATTRS, indexes: ACTIVITY_IDX },

  // Chat messages are written only by the staff function; each message is readable by its two people and by Super Admins.
  { id: "messages", name: "Messages", docSec: true, perms: perms({ read: [SUPER] }),
    attrs: [S("pair", 80), S("fromId", 36), S("fromName", 100), S("fromRole", 20), S("toId", 36), S("toName", 100), S("text", 2000)],
    indexes: [["idx_pair", "key", ["pair"]], ["idx_to", "key", ["toId"]]] },
];

async function waitForAttributes(colId, keys) {
  for (let i = 0; i < 90; i++) {
    const { attributes } = await api("GET", `/databases/${DB}/collections/${colId}/attributes`);
    const mine = attributes.filter((a) => keys.includes(a.key));
    if (mine.length === keys.length && mine.every((a) => a.status === "available")) return;
    if (mine.some((a) => a.status === "failed")) throw new Error(`Attribute failed in ${colId}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for attributes of ${colId}`);
}

console.log(`\nAppwrite setup: ${ENDPOINT}  project=${PROJECT}\n`);

// ---------- database ----------
console.log("Database");
if (await exists(`/databases/${DB}`)) {
  console.log(`  = database "${DB}" (already exists)`);
} else {
  try {
    await api("POST", "/databases", { databaseId: DB, name: "SafeHaven Insure" });
    console.log(`  + database "${DB}"`);
  } catch (e) {
    if (e.code === 403) {
      const { databases } = await api("GET", "/databases");
      console.error("\nThe current plan allows only one database, and this project already has:");
      databases.forEach((d) => console.error(`   - ${d.name}  (ID: ${d.$id})`));
      console.error("\nSet VITE_APPWRITE_DATABASE_ID in .env to one of the IDs above, or delete the existing database in the Console and rerun setup.\n");
      process.exit(1);
    }
    throw e;
  }
}

// ---------- collections ----------
for (const c of collections) {
  console.log(`\nCollection: ${c.id}`);
  await ensure(`collection ${c.id}`, () =>
    api("POST", `/databases/${DB}/collections`, { collectionId: c.id, name: c.name, permissions: c.perms, documentSecurity: !!c.docSec })
  );
  // Update permissions on existing collections to match the current role system.
  await api("PUT", `/databases/${DB}/collections/${c.id}`, { name: c.name, permissions: c.perms, documentSecurity: !!c.docSec });

  for (const a of c.attrs) {
    const { type, key, ...rest } = a;
    await ensure(`${type} ${key}`, () => api("POST", `/databases/${DB}/collections/${c.id}/attributes/${type}`, { key, required: false, ...rest }));
  }
  await waitForAttributes(c.id, c.attrs.map((a) => a.key));
  for (const [key, type, attributes] of c.indexes) {
    await ensure(`index ${key}`, () => api("POST", `/databases/${DB}/collections/${c.id}/indexes`, { key, type, attributes }));
  }
}

// ---------- storage ----------
console.log("\nStorage bucket");
const bucketBody = {
  name: "Admin media",
  // Public read allows profile images to render; only staff can upload, update, or delete.
  permissions: ['read("any")', ...[SUPER, ADMIN, EMP].flatMap((r) => [`create("${r}")`, `update("${r}")`, `delete("${r}")`])],
  fileSecurity: false,
  enabled: true,
  maximumFileSize: 5 * 1024 * 1024,
  allowedFileExtensions: ["jpg", "jpeg", "png", "webp"],
};
if (await exists(`/storage/buckets/${BUCKET}`)) {
  console.log(`  = bucket "${BUCKET}" (already exists)`);
  await api("PUT", `/storage/buckets/${BUCKET}`, bucketBody);
} else {
  await ensure(`bucket "${BUCKET}"`, () => api("POST", "/storage/buckets", { bucketId: BUCKET, ...bucketBody }));
}

// ---------- function ----------
console.log("\nFunction: staff (user management)");
const fnBody = {
  name: "Staff Manager",
  execute: ["users"],
  scopes: ["users.read", "users.write", "databases.read", "databases.write", "documents.read", "documents.write"],
  entrypoint: "src/main.js",
  commands: "",
  timeout: 15,
  enabled: true,
  logging: true,
};

let runtime = env.FUNCTION_RUNTIME || "";
if (!runtime) {
  try {
    const { runtimes } = await api("GET", "/functions/runtimes");
    const nodes = runtimes.map((r) => r.$id || r.name).filter((n) => /^node-\d+(\.\d+)?$/.test(n || ""));
    nodes.sort((a, b) => parseFloat(b.slice(5)) - parseFloat(a.slice(5)));
    runtime = nodes[0] || "node-22";
  } catch {
    runtime = "node-22";
  }
}
console.log(`  runtime: ${runtime}`);

if (await exists(`/functions/${FN}`)) {
  await api("PUT", `/functions/${FN}`, { ...fnBody, runtime });
  console.log(`  = function "${FN}" updated`);
} else {
  await ensure(`function "${FN}"`, () => api("POST", "/functions", { functionId: FN, runtime, ...fnBody }));
}

await api("POST", `/functions/${FN}/variables`, { key: "DB_ID", value: DB }).catch(async () => {
  const { variables } = await api("GET", `/functions/${FN}/variables`);
  const v = variables.find((x) => x.key === "DB_ID");
  if (v) await api("PUT", `/functions/${FN}/variables/${v.$id}`, { key: "DB_ID", value: DB });
});

// Package the function source as a tar.gz archive for deployment.
const tmp = mkdtempSync(join(tmpdir(), "sh-fn-"));
const archive = join(tmp, "code.tar.gz");
try {
  execFileSync("tar", ["-czf", archive, "-C", "functions/staff", "."]);
} catch {
  console.error("  ! The 'tar' command was not found. Install or enable tar, then run setup again.");
  process.exit(1);
}
const form = new FormData();
form.append("entrypoint", "src/main.js");
form.append("commands", "");
form.append("activate", "true");
form.append("code", new Blob([readFileSync(archive)], { type: "application/gzip" }), "code.tar.gz");
rmSync(tmp, { recursive: true, force: true });

const up = await fetch(`${ENDPOINT}/functions/${FN}/deployments`, { method: "POST", headers, body: form });
const upData = await up.json().catch(() => ({}));
if (!up.ok) {
  console.error("  ! deployment upload failed -> " + (upData.message || up.statusText));
  process.exit(1);
}
console.log("  + code uploaded, building...");
for (let i = 0; i < 90; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const d = await api("GET", `/functions/${FN}/deployments/${upData.$id}`);
  if (d.status === "ready") { console.log("  + function is live"); break; }
  if (d.status === "failed") {
    console.error("  ! build failed:\n" + (d.buildLogs || "(no logs)"));
    process.exit(1);
  }
  if (i === 89) console.log("  ~ the build is still running. Check Console > Functions > staff; it will go live shortly.");
}

// ---------- first Super Admin ----------
console.log("\nSuper Admin");
if (!OWNER_EMAIL) {
  console.log("  ~ OWNER_EMAIL is not set in .env. In Console > Auth > Users, add the 'superadmin' label to your user.");
} else {
  const { users } = await api("GET", `/users?search=${encodeURIComponent(OWNER_EMAIL)}`);
  let user = users.find((u) => (u.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase());
  if (!user) {
    if (OWNER_PASSWORD.length >= 8) {
      user = await api("POST", "/users", { userId: "unique()", email: OWNER_EMAIL, password: OWNER_PASSWORD, name: OWNER_NAME });
      console.log(`  + user created: ${OWNER_EMAIL}`);
    } else {
      console.log(`  ~ ${OWNER_EMAIL} does not exist yet. Set OWNER_PASSWORD (8+ characters) in .env, or sign in once with Google/GitHub first, then run this command again.`);
    }
  }
  if (user) {
    const labels = [...(user.labels || []).filter((l) => !["superadmin", "admin", "employee"].includes(l)), "superadmin"];
    await api("PUT", `/users/${user.$id}/labels`, { labels });
    await api("PATCH", `/users/${user.$id}/verification`, { emailVerification: true }).catch(() => {});
    console.log(`  + ${OWNER_EMAIL} is now Super Admin`);
  }
}

console.log("\nSetup complete.\n");
