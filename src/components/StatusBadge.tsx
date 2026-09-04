import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-muted text-muted-foreground" },
  ASSIGNED: { label: "Assigned", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  SEARCHING: { label: "Searching", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  REASSIGNED: { label: "Reassigned", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  FOUND: { label: "Found", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  SAMPLE_COLLECTED: { label: "Sample Collected", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  AWAITING_APPROVAL: { label: "Awaiting Approval", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  PURCHASED: { label: "Purchased", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  BRANDING_IN_PROGRESS: { label: "Branding In Progress", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  BRANDING_COMPLETE: { label: "Branding Complete", className: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" },
  DISTRIBUTED: { label: "Distributed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  UNAVAILABLE: { label: "Unavailable", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className
      )}
      role="status"
      aria-label={config.label}
    >
      {config.label}
    </span>
  );
}
