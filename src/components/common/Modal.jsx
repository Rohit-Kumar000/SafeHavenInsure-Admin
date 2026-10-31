import { useEffect } from "react";
import { X } from "lucide-react";

const sizes = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

function Modal({ open, onClose, title, children, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`animate-fade-up relative max-h-[92dvh] w-full ${sizes[size]} overflow-y-auto rounded-t-3xl border border-gray-200 border-t-gold-400 bg-white p-5 shadow-2xl sm:rounded-2xl sm:border-t-gray-200 sm:p-6 dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;