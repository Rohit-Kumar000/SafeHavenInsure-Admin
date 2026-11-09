// Store activity records by role; enforce access through Appwrite permissions.
import { databases, config, ID, Permission, Role } from "./appwrite";

const COLLECTION = { superadmin: "activity_super", admin: "activity_admin", employee: "activity_employee" };

export function logActivity(user, action, entity, entityId, summary) {
  const col = COLLECTION[user?.role];
  if (!col) return Promise.resolve();
  return databases
    .createDocument(config.databaseId, col, ID.unique(), {
      userId: user.id,
      userName: String(user.name || "").slice(0, 100),
      role: user.role,
      action: String(action).slice(0, 40),
      entity: String(entity || "").slice(0, 40),
      entityId: String(entityId || "").slice(0, 40),
      summary: String(summary || "").slice(0, 300),
    }, [Permission.read(Role.user(user.id))])
    .catch(() => {
      /* logging must never block the work */
    });
}

export const ACTIVITY_COLLECTIONS = COLLECTION;
