import { Client, Account, Databases, Storage, Functions, ID, Query, Permission, Role } from "appwrite";

const env = import.meta.env;

export const config = {
  endpoint: env.VITE_APPWRITE_ENDPOINT,
  projectId: env.VITE_APPWRITE_PROJECT_ID,
  databaseId: env.VITE_APPWRITE_DATABASE_ID || "safehaven",
  bucketId: env.VITE_APPWRITE_BUCKET_ID || "media",
  functionId: env.VITE_APPWRITE_FUNCTION_ID || "staff",
  oauth: (env.VITE_OAUTH_PROVIDERS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
};

export const isConfigured = !!(config.endpoint && config.projectId);

const client = new Client();
if (isConfigured) client.setEndpoint(config.endpoint).setProject(config.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export { client, ID, Query, Permission, Role };

// ---------- Roles (Appwrite user labels) ----------
export const ROLES = ["superadmin", "admin", "employee"];
export const ROLE_NAME = { superadmin: "Super Admin", admin: "Admin", employee: "Employee", pending: "Pending approval" };

export const roleOf = (labels = []) => ROLES.find((r) => labels.includes(r)) || "pending";

// UI permissions only control visibility; enforce security in Appwrite permissions and functions.
export function permsFor(role) {
  const isSuper = role === "superadmin";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";
  return {
    role,
    isSuper,
    isAdmin,
    isEmployee,
    hasAccess: isSuper || isAdmin || isEmployee,
    canWrite: isSuper || isEmployee, // create and edit customers, policies, claims, payments
    canDelete: isSuper,
    canConfigure: isSuper, // plans, rates, company settings
    canSeeStaff: isSuper || isAdmin,
    canSeeActivity: isSuper || isAdmin || isEmployee, // employees see only their own entries
    canAddStaff: isSuper || isAdmin,
  };
}

// Call the staff function.
export async function callStaff(payload) {
  const exec = await functions.createExecution(config.functionId, JSON.stringify(payload), false, "/", "POST", { "content-type": "application/json" });
  let data = {};
  try { data = JSON.parse(exec.responseBody || "{}"); } catch { /* ignore */ }
  if (!data.ok) {
    const msg = data.error || (exec.status === "failed" ? "The staff function failed. Check that it is deployed." : "Request failed");
    throw new Error(msg);
  }
  return data;
}

export const errMsg = (e, fallback = "Something went wrong. Please try again.") => {
  if (!e) return fallback;
  if (e.code === 401) return "Invalid email or password";
  if (e.code === 429) return "Too many attempts. Please wait a minute and try again.";
  if (e.type === "user_invalid_credentials") return "Invalid email or password";
  if (e.type === "general_rate_limit_exceeded") return "Too many attempts. Please wait a minute and try again.";
  if (e.type === "user_blocked") return "This account has been blocked. Contact the Super Admin.";
  return e.message || fallback;
};
