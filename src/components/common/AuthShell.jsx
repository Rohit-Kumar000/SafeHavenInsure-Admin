import { Sun, Moon, FileText, ClipboardList, BarChart3, ShieldCheck } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Logo from "./Logo";
import logo from "../../assets/logo.jpg";

const features = [
  { icon: FileText, text: "Issue and renew policies in minutes" },
  { icon: ClipboardList, text: "Track every claim from registration to settlement" },
  { icon: BarChart3, text: "Live revenue and portfolio analytics" },
  { icon: ShieldCheck, text: "Secure, role-protected admin access" },
];

// Shared layout for login and password recovery pages.
function AuthShell({ children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh bg-gray-100 dark:bg-slate-950 lg:h-dvh lg:overflow-hidden">
      {/* LEFT: branding (desktop) */}
      <div className="bg-hero relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16">
        <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border border-gold-400/20" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full border border-gold-400/20" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-gold-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-xl ring-2 ring-gold-400/70">
            <img src={logo} alt="SafeHavenInsure logo" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">
            SafeHaven<span className="text-violet-300">Insure</span>
          </span>
        </div>

        <div className="relative">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-200">
            Motor Insurance Admin
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
            Protection managed
            <br />
            with <span className="text-violet-300">precision.</span>
          </h1>
          <p className="mt-5 max-w-md text-slate-200">
            One refined workspace for customers, vehicles, policies, claims and payments.
          </p>
          <ul className="mt-10 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-400/30 bg-white/5 text-gold-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm text-slate-200">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-slate-300/80">© {new Date().getFullYear()} SafeHavenInsure. All rights reserved.</p>
      </div>

      {/* RIGHT: form */}
      <div className="relative flex w-full items-center justify-center no-scrollbar px-4 py-6 lg:w-1/2 lg:overflow-y-auto">
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="absolute right-4 top-4 rounded-xl border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gold-50 hover:text-gold-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-gold-300"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-5 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">
            © {new Date().getFullYear()} SafeHavenInsure · Motor Insurance Management System
          </p>
        </div>
      </div>
    </div>
  );
}

export const formCard =
  "space-y-4 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-2xl shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-7";

export const authInput =
  "w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

export const authBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-800 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 ring-1 ring-inset ring-white/10 transition hover:from-blue-500 hover:to-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 ";

export default AuthShell;
