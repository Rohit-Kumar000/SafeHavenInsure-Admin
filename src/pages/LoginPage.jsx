import { useState } from "react";
import { GithubIcon } from "../components/common/BrandIcons";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import GoogleIcon from "../components/common/GoogleIcon";
import { useAuth } from "../context/AuthContext";
import AuthShell, { formCard, authInput, authBtn } from "../components/common/AuthShell";
import { isConfigured } from "../lib/appwrite";

const PROVIDERS = {
  google: { name: "Google", Icon: () => <GoogleIcon className="h-5 w-5" /> },
  github: { name: "GitHub", Icon: () => <GithubIcon className="h-5 w-5" /> },
};

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();

  const { user, login, loginWithProvider, oauthProviders } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const providers = oauthProviders.filter((p) => PROVIDERS[p]);
  const oauthFailed = params.get("oauth") === "failed";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    const res = await login(email, password, remember);
    if (res.ok) navigate("/dashboard");
    else {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className={formCard} noValidate>
        <div>
          <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
          <div className="mt-2 h-0.5 w-12 rounded-full bg-gold-sheen" />
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Log in to your admin account</p>
        </div>

        {!isConfigured && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Appwrite is not configured. Fill in your <code>.env</code> file and restart the dev server.
          </div>
        )}

        {(error || oauthFailed) && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error || "Social login failed. Please try again or use email and password."}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={authInput}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-gold-700 hover:underline dark:text-gold-300">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${authInput} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-gold-500"
          />
          Keep me signed in on this device
        </label>

        <button type="submit" disabled={loading || !isConfigured} className={authBtn}>
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Logging in...</>) : "Login"}
        </button>

        {providers.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Or continue with</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className={`grid gap-3 ${providers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {providers.map((id) => {
                const { name, Icon } = PROVIDERS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => loginWithProvider(id)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:border-gold-400 hover:bg-gold-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Icon /> {name}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </form>
    </AuthShell>
  );
}

export default LoginPage;
