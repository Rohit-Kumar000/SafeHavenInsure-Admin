import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { useAuth, passwordProblem } from "../context/AuthContext";
import AuthShell, { formCard, authInput, authBtn } from "../components/common/AuthShell";

function ResetPasswordPage() {
  const { completeRecovery } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const userId = params.get("userId");
  const secret = params.get("secret");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    const res = await completeRecovery(userId, secret, password);
    setLoading(false);
    if (res.ok) navigate("/login", { replace: true });
    else setError(res.error);
  };

  return (
    <AuthShell>
      <div className={formCard}>
        {!userId || !secret ? (
          <div className="py-4 text-center">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Invalid reset link</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">This link is incomplete or has expired. Please request a new one.</p>
            <Link to="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Set new password</h2>
              <div className="mt-2 h-0.5 w-12 rounded-full bg-gold-sheen" />
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Use at least 8 characters with letters and numbers.</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {[["New password", password, setPassword], ["Confirm password", confirm, setConfirm]].map(([label, val, set]) => (
              <div key={label}>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={val} onChange={(e) => set(e.target.value)} autoComplete="new-password" className={authInput} />
                </div>
              </div>
            ))}
            <button disabled={loading} className={authBtn}>
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>) : "Reset password"}
            </button>
          </form>
        )}
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </AuthShell>
  );
}

export default ResetPasswordPage;
