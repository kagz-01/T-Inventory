"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsNav from "@/components/ReportsNav";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  BarChart3,
  Package,
  Paintbrush,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

type Order = {
  id: string;
  customerName: string;
  description: string;
  orderType: string;
  status: string;
  quotedAmount: number | null;
  paidAmount: number | null;
  createdAt: string;
};

type SalesData = {
  orders: Order[];
  totalRevenue: number;
  totalPaid: number;
  outstanding: number;
  pendingCount: number;
  byType: Record<string, number>;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ENQUIRY: "bg-muted text-muted-foreground",
  QUOTE_SENT: "border text-foreground",
  QUOTE_ACCEPTED: "bg-primary text-primary-foreground",
  IN_PRODUCTION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  QUALITY_CHECK: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DELIVERED: "bg-primary text-primary-foreground",
  INSTALLED: "bg-primary text-primary-foreground",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  ENQUIRY: "Enquiry",
  QUOTE_SENT: "Quote Sent",
  QUOTE_ACCEPTED: "Quote Accepted",
  IN_PRODUCTION: "In Production",
  QUALITY_CHECK: "Quality Check",
  READY: "Ready",
  DELIVERED: "Delivered",
  INSTALLED: "Installed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ORDER_TYPE_BADGE_STYLES: Record<string, string> = {
  SIGNAGE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BRANDING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MIXED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const TYPE_ICONS: Record<string, typeof Package> = {
  SIGNAGE: Package,
  BRANDING: Paintbrush,
  MIXED: Layers,
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

function OrderTypeBadge({ type }: { type: string }) {
  const className = ORDER_TYPE_BADGE_STYLES[type] || "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {type}
    </span>
  );
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=sales")
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

  const { orders, totalRevenue, totalPaid, outstanding, pendingCount, byType } = data;

  const statusCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <ReportsNav />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {orders.length} total orders across all stages
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-emerald-500 font-medium">All quoted amounts</span>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total Paid</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(totalPaid)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowUpRight className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-500 font-medium">
              {totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}% collected
            </span>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(outstanding)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowDownRight className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium">Pending collection</span>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Pending Orders</span>
          </div>
          <p className="text-2xl font-bold font-mono">{pendingCount}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="h-3 w-3 text-purple-500" />
            <span className="text-xs text-purple-500 font-medium">Not yet completed</span>
          </div>
        </div>
      </div>

      {/* Breakdown by Type & Status */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold font-display">By Order Type</h2>
          </div>
          <div className="space-y-3">
            {["SIGNAGE", "BRANDING", "MIXED"].map((type) => {
              const count = byType[type] || 0;
              const total = orders.length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const Icon = TYPE_ICONS[type] || Package;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{type}</span>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {count} orders
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        type === "SIGNAGE"
                          ? "bg-blue-500"
                          : type === "BRANDING"
                            ? "bg-purple-500"
                            : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-1.5">
                  <StatusBadge status={status} />
                  <span className="text-sm font-mono text-muted-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-sm font-semibold font-display">All Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quoted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-medium">{order.customerName}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-muted-foreground line-clamp-1 max-w-[200px] block">
                      {order.description}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <OrderTypeBadge type={order.orderType} />
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {order.quotedAmount != null ? formatCurrency(order.quotedAmount) : "-"}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {order.paidAmount != null ? formatCurrency(order.paidAmount) : "-"}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No orders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sales data will appear here once orders are created.
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
