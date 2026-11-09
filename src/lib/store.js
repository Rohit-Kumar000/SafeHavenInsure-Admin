// Convert between Appwrite documents and app objects.
import { databases, config, Query } from "./appwrite";

// Fields stored as JSON strings.
const JSON_FIELDS = { policies: ["addons"], claims: ["history"], plans: ["features"] };

const SYSTEM = new Set(["$id", "$createdAt", "$updatedAt", "$permissions", "$databaseId", "$collectionId", "$sequence", "$tenant", "id"]);

export function fromDoc(col, doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) if (!k.startsWith("$")) out[k] = v;
  for (const f of JSON_FIELDS[col] || []) {
    try { out[f] = out[f] ? JSON.parse(out[f]) : []; } catch { out[f] = []; }
  }
  // Normalize nullable Appwrite fields for the UI.
  if (col === "policies") {
    out.idv = out.idv ?? null;
    out.ncb = out.ncb ?? 0;
  }
  out.id = doc.$id;
  out.createdAt = doc.$createdAt;
  return out;
}

export function toDoc(col, data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (SYSTEM.has(k) || k === "createdAt" || v === undefined) continue;
    out[k] = v;
  }
  for (const f of JSON_FIELDS[col] || []) {
    if (f in out) out[f] = JSON.stringify(out[f] ?? []);
  }
  return out;
}

// Fetch all documents in pages of 100.
export async function listAll(col) {
  const all = [];
  let cursor = null;
  for (;;) {
    const queries = [Query.limit(100), Query.orderAsc("$createdAt")];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(config.databaseId, col, queries);
    all.push(...res.documents);
    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return all.map((d) => fromDoc(col, d));
}
