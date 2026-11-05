import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Sun, Moon, SearchX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "../components/common/Logo";

function NotFoundPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo />
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg text-center">
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800">
            <SearchX className="h-14 w-14 text-blue-700 dark:text-blue-400" />
          </div>

          <h1 className="bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-8xl font-extrabold tracking-tight text-transparent sm:text-9xl">
            404
          </h1>

          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Page not found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-slate-400">
            Sorry, the page you are looking for does not exist, may have been
            moved, or the URL was typed incorrectly.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate(-1)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" /> Go Back
            </button>

            <Link
              to={user ? "/dashboard" : "/login"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-700 sm:w-auto"
            >
              <Home className="h-4 w-4" />
              {user ? "Go to Dashboard" : "Go to Login"}
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-4 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
        © 2026 SafeHavenInsure. Motor Insurance Management System
      </footer>
    </div>
  );
}

export default NotFoundPage;