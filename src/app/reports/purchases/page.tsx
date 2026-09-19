"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsNav from "@/components/ReportsNav";
import { exportToCSV } from "@/lib/csv";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  ShoppingCart,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Download,
} from "lucide-react";

type PurchaseOrder = {
  id: string;
  status: string;
  totalEstimate: number | null;
  expectedDate: string | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
};

type PurchasesData = {
  purchaseOrders: PurchaseOrder[];
  totalSpend: number;
  pendingCount: number;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "border text-foreground",
  PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PARTIAL: "Partial",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

function formatCurrency(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

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

export default function PurchasesReportPage() {
  const [data, setData] = useState<PurchasesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=purchases")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <ReportsNav />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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

  const { purchaseOrders, totalSpend, pendingCount } = data;

  const receivedCount = purchaseOrders.filter((po) => po.status === "RECEIVED").length;

  const statusCounts = purchaseOrders.reduce(
    (acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const activeStatuses = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const maxStatusCount = Math.max(...activeStatuses.map(([, c]) => c), 1);

  return (
    <div className="space-y-6">
      <ReportsNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchases Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {purchaseOrders.length} total purchase orders across all statuses
          </p>
        </div>
        <button
          onClick={() => exportToCSV(purchaseOrders.map((po) => ({
            Supplier: po.supplier?.name ?? "",
            Status: po.status,
            "Total Estimate": po.totalEstimate ?? "",
            "Expected Date": po.expectedDate ?? "",
            "Created At": po.createdAt,
          })), "purchase-orders-report.csv")}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total Spend</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(totalSpend)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-emerald-500 font-medium">All estimated amounts</span>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Pending POs</span>
          </div>
          <p className="text-2xl font-bold font-mono">{pendingCount}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowDownRight className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium">Draft or submitted</span>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Received POs</span>
          </div>
          <p className="text-2xl font-bold font-mono">{receivedCount}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowUpRight className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-500 font-medium">Fully received</span>
          </div>
        </div>
      </div>

      {/* Status Distribution & Purchase Orders Table */}
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="card-glass rounded-2xl p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold font-display">Status Distribution</h2>
          </div>
          <div className="space-y-3">
            {activeStatuses.map(([status, count]) => {
              const pct = Math.round((count / maxStatusCount) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <StatusBadge status={status} />
                    <span className="text-sm font-mono text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        status === "RECEIVED"
                          ? "bg-emerald-500"
                          : status === "SUBMITTED"
                            ? "bg-blue-500"
                            : status === "PARTIAL"
                              ? "bg-amber-500"
                              : status === "CANCELLED"
                                ? "bg-red-500"
                                : "bg-muted-foreground/40"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {activeStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
            )}
          </div>
        </div>

        <div className="card-glass rounded-2xl overflow-hidden lg:col-span-3">
          <div className="p-6 pb-4">
            <h2 className="text-sm font-semibold font-display">Purchase Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Estimate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium">{po.supplier?.name ?? "—"}</span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {po.totalEstimate != null ? formatCurrency(po.totalEstimate) : "-"}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {po.expectedDate
                        ? new Date(po.expectedDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No purchase orders yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Purchase data will appear here once orders are created.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
