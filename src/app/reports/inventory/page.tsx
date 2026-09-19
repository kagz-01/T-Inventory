"use client";

import { useEffect, useState } from "react";
import ReportsNav from "@/components/ReportsNav";
import { Package, AlertTriangle, TrendingDown, Download } from "lucide-react";

interface Material {
  id: string;
  name: string;
  category: string;
  stockOnHand: number;
  reorderThreshold: number;
  costPerUnit: number;
  unit: string;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  material: { id: string; name: string; unit: string } | null;
  actor?: { id: string; name: string } | null;
}

interface InventoryData {
  materials: Material[];
  lowStock: Material[];
  totalItems: number;
  totalValue: number;
  movements: Movement[];
}

export default function InventoryReportPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=inventory")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <ReportsNav />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <ReportsNav />
        <div className="card-glass rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">Failed to load inventory report.</p>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Items",
      value: data.materials.length,
      icon: Package,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Total Stock Units",
      value: data.totalItems.toLocaleString(),
      icon: Package,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "Total Value",
      value: `₦${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Low Stock",
      value: data.lowStock.length,
      icon: AlertTriangle,
      color: data.lowStock.length > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500",
    },
  ];

  function handleExport() {
    console.log("Export inventory report:", data);
  }

  return (
    <div className="space-y-6">
      <ReportsNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Inventory Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Materials overview and stock movements
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Materials Table */}
      <div className="card-glass rounded-2xl p-6">
        <h2 className="text-base font-bold font-display mb-4">All Materials</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Category
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  Stock on Hand
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  Reorder Threshold
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  Cost / Unit
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  Stock Value
                </th>
              </tr>
            </thead>
            <tbody>
              {data.materials.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border/30 last:border-0"
                >
                  <td className="py-3 px-2 font-medium">{m.name}</td>
                  <td className="py-3 px-2 text-muted-foreground">
                    {m.category}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {m.stockOnHand} {m.unit}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {m.reorderThreshold} {m.unit}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    ₦{(m.costPerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    ₦{(m.stockOnHand * (m.costPerUnit || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {data.materials.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No materials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Alert */}
      {data.lowStock.length > 0 && (
        <div className="card-glass rounded-2xl p-6 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <h2 className="text-base font-bold font-display">
              Low Stock Alert
            </h2>
            <span className="ml-auto text-xs font-mono text-amber-500">
              {data.lowStock.length} item{data.lowStock.length === 1 ? "" : "s"} below threshold
            </span>
          </div>
          <div className="space-y-2">
            {data.lowStock.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                  {m.stockOnHand}/{m.reorderThreshold} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Stock Movements */}
      <div className="card-glass rounded-2xl p-6">
        <h2 className="text-base font-bold font-display mb-4">
          Recent Stock Movements
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Material
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Type
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  Quantity
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Actor
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {data.movements.slice(0, 20).map((mov) => (
                <tr
                  key={mov.id}
                  className="border-b border-border/30 last:border-0"
                >
                  <td className="py-3 px-2 font-medium">
                    {mov.material?.name ?? "—"}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        mov.type === "IN"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : mov.type === "OUT"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {mov.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {mov.quantity} {mov.material?.unit ?? ""}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">
                    {mov.actor?.name ?? "—"}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">
                    {new Date(mov.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data.movements.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No stock movements recorded yet.
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
