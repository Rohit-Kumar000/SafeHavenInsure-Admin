import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell, { formCard, authInput, authBtn } from "../components/common/AuthShell";

function ForgotPasswordPage() {
  const { sendRecovery } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address");
    setLoading(true);
    const res = await sendRecovery(email);
    setLoading(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  };

  return (
    <AuthShell>
      <div className={formCard}>
        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
              <MailCheck className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Check your email</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              If <b>{email}</b> is registered, a password reset link is on its way. The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div>
              <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
              <div className="mt-2 h-0.5 w-12 rounded-full bg-gold-sheen" />
              <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                Enter your admin email and we will send you a secure reset link.
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" className={authInput} />
            </div>
            <button disabled={loading} className={authBtn}>
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>) : "Send reset link"}
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

export default ForgotPasswordPage;
