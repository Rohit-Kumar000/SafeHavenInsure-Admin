// Lazy page loaders shared by the router and the preloader.
// Preloading a page chunk before the click makes navigation feel instant.
export const pageLoaders = {
  "/dashboard": () => import("../pages/DashboardPage"),
  "/customers": () => import("../pages/CustomersPage"),
  "/vehicles": () => import("../pages/VehiclesPage"),
  "/plans": () => import("../pages/PolicyPlansPage"),
  "/policies/new": () => import("../pages/NewPolicyPage"),
  "/policies": () => import("../pages/PoliciesPage"),
  "/renewals": () => import("../pages/RenewalsPage"),
  "/claims": () => import("../pages/ClaimsPage"),
  "/payments": () => import("../pages/PaymentsPage"),
  "/reports": () => import("../pages/ReportsPage"),
  "/profile": () => import("../pages/ProfilePage"),
  "/settings": () => import("../pages/SettingsPage"),
  "/staff": () => import("../pages/StaffPage"),
  "/chat": () => import("../pages/ChatPage"),
  "/activity": () => import("../pages/ActivityPage"),
};

const started = new Map();

// Start loading a page chunk once; later calls reuse the same promise.
export function preloadPage(path) {
  const load = pageLoaders[path];
  if (!load) return undefined;
  if (!started.has(path)) started.set(path, load().catch(() => started.delete(path)));
  return started.get(path);
}

// Load the remaining pages in the background once the browser is idle.
export function preloadAllPages(paths = Object.keys(pageLoaders)) {
  const queue = [...paths];
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  const next = () => {
    const path = queue.shift();
    if (!path) return;
    preloadPage(path);
    idle(next);
  };
  idle(next);
}
