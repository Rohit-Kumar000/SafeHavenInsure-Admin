import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageSkeleton from "../common/PageSkeleton";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { preloadAllPages } from "../../lib/routePreload";

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false); // desktop: icons only
  const { pathname } = useLocation();
  // The mobile menu belongs to the page it was opened on, so it closes by itself when you navigate.
  const [openAt, setOpenAt] = useState(null);
  const mobileOpen = openAt === pathname;
  const setMobileOpen = (v) => setOpenAt(v ? pathname : null);

  // Keep the page behind the open menu from scrolling.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Warm up all page chunks in the background so tab switches are instant.
  useEffect(() => { preloadAllPages(); }, []);

  return (
    // Keep the app shell fixed; the main content area handles scrolling.
    <div className="flex h-dvh overflow-hidden bg-gray-100 text-gray-800 dark:bg-slate-950 dark:text-slate-200">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <div className="ml-16 flex min-w-0 flex-1 flex-col lg:ml-0">
        <Navbar onOpenMobile={() => setMobileOpen(true)} />

        {/* Only this area scrolls */}
        <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex-1 p-3 sm:p-6">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;