function Bar({ className = "" }) {
  return <div className={`relative overflow-hidden rounded-lg bg-gray-200/80 dark:bg-slate-800 ${className}`}>
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5 [animation:shimmer_1.4s_infinite]" />
  </div>;
}

// Show a lightweight placeholder while the page loads.
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bar className="h-8 w-56" />
        <Bar className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-32 rounded-2xl" />)}
      </div>
      <Bar className="h-72 rounded-2xl" />
    </div>
  );
}

export default PageSkeleton;
