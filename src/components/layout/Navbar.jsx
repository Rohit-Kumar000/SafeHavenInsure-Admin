import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu, Search, Sun, Moon, LogOut, ChevronDown,
  ChevronRight, User, Settings, Home,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import GlobalSearch from "./GlobalSearch";
import Avatar from "../common/Avatar";
import { useData } from "../../context/DataContext";
import { Loader2 } from "lucide-react";

const titles = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/vehicles": "Vehicles",
  "/plans": "Policy Plans",
  "/policies": "Policies",
  "/policies/new": "New Policy",
  "/renewals": "Renewals",
  "/claims": "Claims",
  "/payments": "Payments",
  "/reports": "Reports",
  "/profile": "My Profile",
  "/settings": "Settings",
  "/staff": "Staff",
  "/activity": "Activity",
  "/chat": "Chat",
};

// Breadcrumb: Dashboard / Customers
function getCrumbs(pathname) {
  const crumbs = [{ name: "Dashboard", path: "/dashboard" }];
  if (pathname === "/dashboard") return crumbs;

  if (pathname === "/policies/new") {
    crumbs.push({ name: "Policies", path: "/policies" });
    crumbs.push({ name: "New Policy", path: pathname });
  } else if (titles[pathname]) {
    crumbs.push({ name: titles[pathname], path: pathname });
  }
  return crumbs;
}

// Close dropdown on outside click
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function Navbar({ onOpenMobile }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const { user, logout } = useAuth();
  const { syncing } = useData();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useClickOutside(profileRef, () => setProfileOpen(false));
  useClickOutside(searchRef, () => setMobileSearch(false));

  const crumbs = getCrumbs(pathname);
  const pageTitle = crumbs[crumbs.length - 1]?.name || "Dashboard";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const iconBtn =
    "rounded-lg p-2 text-gray-600 transition hover:bg-gold-50 hover:text-gold-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-gold-300";

  const menuItem =
    "flex w-full items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700";

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/85 px-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:px-6">
      {/* Left: mobile menu button + breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2 sm:gap-3">
        <button
          onClick={onOpenMobile}
          className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gold-50 hover:text-gold-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Phones: just the page you are on, never wider than the space available */}
        <p className="min-w-0 truncate font-display text-base font-bold text-gray-900 dark:text-white sm:hidden">{pageTitle}</p>

        {/* Tablets and desktops: full breadcrumb */}
        <nav className="hidden min-w-0 items-center gap-1.5 overflow-hidden text-sm sm:flex">
          <Home className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500" />
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <div key={c.path} className={`flex items-center gap-1.5 ${isLast ? "min-w-0" : "shrink-0"}`}>
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />}
                {isLast ? (
                  <span className="truncate whitespace-nowrap font-semibold text-gray-900 dark:text-white">{c.name}</span>
                ) : (
                  <Link
                    to={c.path}
                    className="whitespace-nowrap text-gray-500 hover:text-gold-700 dark:text-slate-400 dark:hover:text-gold-300"
                  >
                    {c.name}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        {syncing && (
          <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-500/10 dark:text-gold-300 sm:inline-flex">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
          </span>
        )}
        {/* Search: desktop */}
        <div className="mr-2 hidden w-60 md:block lg:w-80">
          <GlobalSearch shortcut />
        </div>

        {/* Search: mobile icon + bar */}
        <div ref={searchRef} className="md:hidden">
          <button onClick={() => setMobileSearch((s) => !s)} className={iconBtn} title="Search">
            <Search className="h-5 w-5" />
          </button>

          {mobileSearch && (
            <div className="fixed left-16 right-0 top-16 z-40 border-b border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <GlobalSearch autoFocus onDone={() => setMobileSearch(false)} />
            </div>
          )}
        </div>

        {/* Dark / Light */}
        <button onClick={toggleTheme} className={iconBtn} title="Toggle theme">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <Avatar className="h-9 w-9 rounded-full text-sm ring-2 ring-gold-400/60" />
            <div className="hidden text-left sm:block">
              <p className="max-w-[120px] truncate text-sm font-medium leading-tight text-gray-800 dark:text-white">
                {user?.name}
              </p>
              <p className="text-xs leading-tight text-gold-700 dark:text-gold-300">{user?.roleName || "Admin"}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3 bg-luxe px-4 py-4 text-white">
                <Avatar className="h-11 w-11 rounded-full text-base ring-2 ring-gold-400/70" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-gold-200">{user?.email}</p>
                </div>
              </div>

              <div className="py-1 text-sm text-gray-700 dark:text-slate-200">
                <Link to="/profile" onClick={() => setProfileOpen(false)} className={menuItem}>
                  <User className="h-4 w-4" /> My Profile
                </Link>
                {user?.canConfigure && (
                  <Link to="/settings" onClick={() => setProfileOpen(false)} className={menuItem}>
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                )}
                <button onClick={toggleTheme} className={menuItem}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              </div>

              <div className="border-t border-gray-200 py-1 dark:border-slate-700">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-slate-700"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;