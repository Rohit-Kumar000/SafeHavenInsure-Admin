import { Navigate, Outlet } from "react-router-dom";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import Splash from "./common/Splash";
import { isConfigured } from "../lib/appwrite";

function Notice({ title, children, action }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-100 p-6 dark:bg-slate-950">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-slate-300">{children}</div>
        {action}
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading, logout, refreshUser } = useAuth();
  const { loading: dataLoading } = useData();

  if (!isConfigured) {
    return (
      <Notice title="Appwrite is not configured">
        <p>Copy <code>.env.example</code> to <code>.env</code>, fill in your Appwrite endpoint and project ID, then restart <code>npm run dev</code>.</p>
      </Notice>
    );
  }
  if (loading) return <Splash text="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace />;

  if (!user.hasAccess) {
    return (
      <Notice
        title="Waiting for approval"
        action={
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => refreshUser().catch(() => {})} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Refresh
            </button>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        }
      >
        <p>
          <b>{user.email}</b> is signed in but has not been given a role yet.
        </p>
        <p>Ask the Super Admin to approve your account in <b>Staff</b>. You will get access as soon as they do. Then press Refresh.</p>
      </Notice>
    );
  }

  if (dataLoading) return <Splash text="Loading your data..." />;
  return <Outlet />;
}

export default ProtectedRoute;

// Restrict routes according to the signed-in user role.
export function RequirePerm({ need }) {
  const { user } = useAuth();
  return user?.[need] ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
