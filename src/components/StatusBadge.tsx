const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  SEARCHING: "bg-indigo-100 text-indigo-700",
  REASSIGNED: "bg-amber-100 text-amber-700",
  FOUND: "bg-teal-100 text-teal-700",
  SAMPLE_COLLECTED: "bg-cyan-100 text-cyan-700",
  AWAITING_APPROVAL: "bg-purple-100 text-purple-700",
  PURCHASED: "bg-green-100 text-green-700",
  BRANDING_IN_PROGRESS: "bg-orange-100 text-orange-700",
  BRANDING_COMPLETE: "bg-lime-100 text-lime-700",
  DISTRIBUTED: "bg-emerald-100 text-emerald-700",
  UNAVAILABLE: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  SEARCHING: "Searching",
  REASSIGNED: "Reassigned",
  FOUND: "Found",
  SAMPLE_COLLECTED: "Sample Collected",
  AWAITING_APPROVAL: "Awaiting Approval",
  PURCHASED: "Purchased",
  BRANDING_IN_PROGRESS: "Branding In Progress",
  BRANDING_COMPLETE: "Branding Complete",
  DISTRIBUTED: "Distributed",
  UNAVAILABLE: "Unavailable",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-default ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`}
      role="status"
      aria-label={STATUS_LABELS[status]}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
