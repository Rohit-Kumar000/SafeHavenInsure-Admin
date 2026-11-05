import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Car, ShieldCheck, FilePlus, FileText,
  RefreshCw, ClipboardList, CreditCard, BarChart3, Settings, UserCog, Activity,
  X, ChevronLeft, ChevronRight, MessageCircle,
} from "lucide-react";
import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";
import { useChatUnread } from "../../lib/chatUnread";
import { preloadPage } from "../../lib/routePreload";

const menu = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Vehicles", path: "/vehicles", icon: Car },
  { name: "Policy Plans", path: "/plans", icon: ShieldCheck },
  { name: "New Policy", path: "/policies/new", icon: FilePlus, need: "canWrite" },
  { name: "Policies", path: "/policies", icon: FileText, end: true },
  { name: "Renewals", path: "/renewals", icon: RefreshCw },
  { name: "Claims", path: "/claims", icon: ClipboardList },
  { name: "Payments", path: "/payments", icon: CreditCard },
  { name: "Reports", path: "/reports", icon: BarChart3 },
  { name: "Chat", path: "/chat", icon: MessageCircle },
  { name: "Staff", path: "/staff", icon: UserCog, need: "canSeeStaff" },
  { name: "Activity", path: "/activity", icon: Activity, need: "canSeeActivity" },
  { name: "Settings", path: "/settings", icon: Settings, need: "canConfigure" },
];

/*
  Three pieces share one menu:
    - desktop sidebar (collapsible to icons)
    - phone rail: always-visible icon strip on the left
    - phone drawer: full menu that slides over the rail from the menu button
*/
function Sidebar({ collapsed, mobileOpen, onClose, onToggle }) {
  const { user } = useAuth();
  const chatUnread = useChatUnread(user?.id);
  const [tip, setTip] = useState(null);
  const items = menu.filter((m) => !m.need || user?.[m.need]);

  const showTip = (e, name) => {
    if (!collapsed || !window.matchMedia("(min-width: 1024px)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ name, top: r.top + r.height / 2, left: r.right + 12 });
  };

  // labels: show the text next to each icon. big: roomier rows for the phone drawer.
  const renderNav = ({ labels, big = false, afterClick, tips = false }) => (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar p-2 pt-4">
      {items.map(({ name, path, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          title={labels ? undefined : name}
          aria-label={name}
          onMouseEnter={(e) => { if (tips) showTip(e, name); preloadPage(path); }}
          onFocus={() => preloadPage(path)}
          onTouchStart={() => preloadPage(path)}
          onMouseLeave={() => setTip(null)}
          onClick={() => { setTip(null); afterClick?.(); }}
          className={({ isActive }) =>
            `group relative flex items-center rounded-xl text-sm font-medium transition ${
              labels ? `gap-3 px-3.5 ${big ? "py-3" : "py-2.5"}` : "justify-center py-3"
            } ${
              isActive
                ? "bg-gold-300/15 text-gold-300 shadow-inner ring-1 ring-gold-300/40 before:absolute before:-left-2 before:bottom-2 before:top-2 before:w-1 before:rounded-r-full before:bg-gold-sheen"
                : "text-gold-100/85 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <span className="relative shrink-0">
            <Icon className="h-5 w-5 transition group-hover:text-gold-300" />
            {path === "/chat" && chatUnread && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-[#46341f]" />
            )}
          </span>
          {labels && <span className="whitespace-nowrap">{name}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className={`relative hidden h-full min-h-0 shrink-0 flex-col border-r border-white/10 bg-luxe text-gold-100 shadow-2xl transition-all duration-300 lg:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[72px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gold-300/60 bg-[#46341f] text-gold-300 shadow-md transition hover:bg-gold-300 hover:text-[#46341f]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-3">
          <Logo showText={!collapsed} onDark />
        </div>

        {renderNav({ labels: !collapsed, tips: true })}

        {!collapsed && (
          <div className="border-t border-white/10 p-4 text-xs text-gold-200/60">Motor Insurance Admin · v2.0</div>
        )}
      </aside>

      {/* ---------- Phone rail: icons always visible ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-white/10 bg-luxe text-gold-100 shadow-xl lg:hidden">
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/10">
          <Logo showText={false} onDark />
        </div>
        {renderNav({ labels: false })}
      </aside>

      {/* ---------- Phone drawer ---------- */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#2b1f14]/60 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-luxe text-gold-100 shadow-2xl transition-[transform,visibility] duration-300 ease-out lg:hidden ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3">
          <Logo showText onDark />
          <button onClick={onClose} aria-label="Close menu" className="shrink-0 rounded-lg p-2 text-gold-100 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        {renderNav({ labels: true, big: true, afterClick: onClose })}
        <div className="border-t border-white/10 p-4 text-xs text-gold-200/60">Motor Insurance Admin · v2.0</div>
      </aside>

      {tip && collapsed && (
        <span
          style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white lg:block"
        >
          {tip.name}
        </span>
      )}
    </>
  );
}

export default Sidebar;
