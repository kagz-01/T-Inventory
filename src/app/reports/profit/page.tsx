"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsNav from "@/components/ReportsNav";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertCircle,
} from "lucide-react";

type ProfitData = {
  totalRevenue: number;
  totalCost: number;
  totalPOCost: number;
  totalMaterialCost: number;
  grossProfit: number;
  margin: number;
  ordersCount: number;
  poCount: number;
};

function formatCurrency(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function ProfitReportPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=profit")
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
      </div>
    );
  }

  const isProfit = data.grossProfit >= 0;

  return (
    <div className="space-y-6">
      <ReportsNav />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profit & Cost Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revenue vs. costs across {data.ordersCount} orders and {data.poCount} purchase orders
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(data.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1.5">From customer orders</p>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <ShoppingCart className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total Cost</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(data.totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-1.5">POs + material value</p>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isProfit ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {isProfit ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">Gross Profit</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {isProfit ? "" : "-"}{formatCurrency(Math.abs(data.grossProfit))}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">{data.margin}% margin</p>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Material Value</span>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(data.totalMaterialCost)}</p>
          <p className="text-xs text-muted-foreground mt-1.5">Current stock on hand</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="card-glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold font-display mb-4">Cost Breakdown</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Purchase Orders</span>
              <span className="text-sm font-mono font-medium">{formatCurrency(data.totalPOCost)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${data.totalCost > 0 ? Math.round((data.totalPOCost / data.totalCost) * 100) : 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Material Inventory Value</span>
              <span className="text-sm font-mono font-medium">{formatCurrency(data.totalMaterialCost)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${data.totalCost > 0 ? Math.round((data.totalMaterialCost / data.totalCost) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs Cost Summary */}
      <div className="card-glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold font-display mb-4">Summary</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Revenue</p>
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(data.totalRevenue)}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Costs</p>
            <p className="text-lg font-bold font-mono text-red-600 dark:text-red-400">{formatCurrency(data.totalCost)}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Profit</p>
            <p className={`text-lg font-bold font-mono ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {isProfit ? "" : "-"}{formatCurrency(Math.abs(data.grossProfit))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
