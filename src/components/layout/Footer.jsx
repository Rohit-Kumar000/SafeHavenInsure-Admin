function Footer() {
  return (
    <footer className="flex flex-col items-center justify-between gap-1 border-t border-gray-200/80 bg-white/70 px-6 py-3 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 sm:flex-row">
      <p>© {new Date().getFullYear()} SafeHavenInsure. All rights reserved.</p>
      <p>Motor Insurance Management System</p>
    </footer>
  );
}

export default Footer;