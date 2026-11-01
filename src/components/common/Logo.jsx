import { useEffect, useState } from "react";
import logo from "../../assets/logo.jpg";
import { useAuth } from "../../context/AuthContext";

// Check whether the browser is online.
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

function Logo({ showText = true, onDark = false }) {
  const { user } = useAuth();
  const online = useOnline();
  const isActive = !!user && online;

  return (
    <div className="flex items-center gap-2.5">
      {/* Logo + status dot */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-gold-400/70">
          <img
            src={logo}
            alt="SafeHavenInsure logo"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Status dot: always on mobile, desktop only in icon-only mode */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ${onDark ? "ring-[#46341f]" : "ring-white dark:ring-slate-900"} ${
            isActive ? "bg-green-500" : "bg-gray-400"
          } ${showText ? "lg:hidden" : ""}`}
        />
      </div>

      {showText && (
        <div className="min-w-0 leading-tight">
          <p className={`whitespace-nowrap font-display text-lg font-bold tracking-tight ${onDark ? "text-white" : "text-gray-900 dark:text-white"}`}>
            SafeHaven<span className={onDark ? "text-gold-gradient" : "text-blue-600 dark:text-blue-400"}>Insure</span>
          </p>

          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium">
            <span className="relative flex h-2 w-2">
              {isActive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isActive ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </span>
            <span
              className={
                isActive
                  ? onDark ? "text-emerald-300" : "text-green-600 dark:text-green-400"
                  : "text-gray-400 dark:text-slate-500"
              }
            >
              {isActive ? "Online" : "Offline"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default Logo;