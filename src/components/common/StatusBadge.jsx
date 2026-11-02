const styles = {
  Active: "green", Verified: "green", Paid: "green", Approved: "green", Settled: "green",
  Pending: "amber", "Under Review": "amber",
  Registered: "blue", Upcoming: "blue",
  Expired: "red", Cancelled: "red", Rejected: "red", Failed: "red",
};

const colors = {
  green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  gray: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

function StatusBadge({ status }) {
  const color = colors[styles[status]] || colors.gray;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}

export default StatusBadge;