"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsNav from "@/components/ReportsNav";
import { exportToCSV } from "@/lib/csv";
import {
  Hammer,
  CheckCircle2,
  Clock,
  PauseCircle,
  BarChart3,
  User,
  Calendar,
  Package,
  Download,
} from "lucide-react";

type Job = {
  id: string;
  title: string;
  status: string;
  assignedTo: { id: string; name: string } | null;
  customerOrder: { id: string; customerName: string } | null;
  dueDate: string | null;
  estimatedHours: number | null;
};

type ProductionData = {
  jobs: Job[];
  totalJobs: number;
  completedCount: number;
  inProgressCount: number;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  QUEUED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_BADGE_STYLES[status] || "bg-muted text-muted-foreground";
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default function ProductionReportPage() {
  const [data, setData] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=production")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <ReportsNav />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-glass rounded-2xl p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="card-glass rounded-2xl p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { jobs, totalJobs, completedCount, inProgressCount } = data;
  const onHoldCount = jobs.filter((j) => j.status === "ON_HOLD").length;

  const statusCounts = jobs.reduce(
    (acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summaryCards = [
    {
      label: "Total Jobs",
      value: totalJobs,
      icon: Hammer,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle2,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: Clock,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "On Hold",
      value: onHoldCount,
      icon: PauseCircle,
      color: onHoldCount > 0 ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <ReportsNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalJobs} total jobs across all statuses
          </p>
        </div>
        <button
          onClick={() => exportToCSV(jobs.map((j) => ({
            Title: j.title,
            Status: j.status,
            "Assigned To": j.assignedTo?.name ?? "",
            "Customer Name": j.customerOrder?.customerName ?? "",
            "Due Date": j.dueDate ?? "",
            "Estimated Hours": j.estimatedHours ?? "",
          })), "production-report.csv")}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="card-glass rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight font-mono">
                {card.value}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold font-display">Status Distribution</h2>
        </div>
        <div className="space-y-2">
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => {
              const pct = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <StatusBadge status={status} />
                    <span className="text-sm font-mono text-muted-foreground">
                      {count} jobs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-sm font-semibold font-display">All Production Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Linked Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{job.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-3">
                    {job.assignedTo ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{job.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {job.customerOrder?.customerName ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {job.dueDate
                      ? new Date(job.dueDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                      <Hammer className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No production jobs yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Production data will appear here once jobs are created.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
