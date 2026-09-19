"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReportsNav from "@/components/ReportsNav";
import Reveal from "@/components/Reveal";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Hammer,
  Users,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

interface ReportSummary {
  inventory: {
    totalItems: number;
    lowStockCount: number;
    totalValue: number;
  } | null;
  purchases: {
    totalSpend: number;
    pendingCount: number;
  } | null;
  sales: {
    totalRevenue: number;
    outstanding: number;
    pendingCount: number;
  } | null;
  production: {
    totalJobs: number;
    completedCount: number;
    inProgressCount: number;
  } | null;
  employees: {
    activeCount: number;
    totalMembers: number;
  } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

const cards = [
  {
    key: "inventory" as const,
    label: "Inventory",
    icon: Package,
    href: "/reports/inventory",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    stats: (s: ReportSummary) => [
      { label: "Total Items", value: s.inventory?.totalItems ?? 0 },
      { label: "Low Stock", value: s.inventory?.lowStockCount ?? 0, danger: (s.inventory?.lowStockCount ?? 0) > 0 },
      { label: "Total Value", value: fmt(s.inventory?.totalValue ?? 0) },
    ],
  },
  {
    key: "purchases" as const,
    label: "Purchases",
    icon: ShoppingCart,
    href: "/reports/purchases",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    stats: (s: ReportSummary) => [
      { label: "Total Spend", value: fmt(s.purchases?.totalSpend ?? 0) },
      { label: "Pending POs", value: s.purchases?.pendingCount ?? 0, warning: (s.purchases?.pendingCount ?? 0) > 0 },
    ],
  },
  {
    key: "sales" as const,
    label: "Sales",
    icon: DollarSign,
    href: "/reports/sales",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    stats: (s: ReportSummary) => [
      { label: "Total Revenue", value: fmt(s.sales?.totalRevenue ?? 0) },
      { label: "Outstanding", value: fmt(s.sales?.outstanding ?? 0), danger: (s.sales?.outstanding ?? 0) > 0 },
      { label: "Orders", value: s.sales?.pendingCount ?? 0 },
    ],
  },
  {
    key: "production" as const,
    label: "Production",
    icon: Hammer,
    href: "/reports/production",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    stats: (s: ReportSummary) => [
      { label: "Total Jobs", value: s.production?.totalJobs ?? 0 },
      { label: "Completed", value: s.production?.completedCount ?? 0 },
      { label: "In Progress", value: s.production?.inProgressCount ?? 0, warning: (s.production?.inProgressCount ?? 0) > 0 },
    ],
  },
  {
    key: "employees" as const,
    label: "Employees",
    icon: Users,
    href: "/reports/employees",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    stats: (s: ReportSummary) => {
      const total = s.employees?.totalMembers ?? 0;
      const active = s.employees?.activeCount ?? 0;
      const rate = total === 0 ? 0 : Math.round((active / total) * 100);
      return [
        { label: "Active Members", value: active },
        { label: "Attendance Rate", value: `${rate}%` },
      ];
    },
  },
];

export default function ReportsOverviewPage() {
  const [summary, setSummary] = useState<ReportSummary>({
    inventory: null,
    purchases: null,
    sales: null,
    production: null,
    employees: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const types = ["inventory", "purchases", "sales", "production", "employees"] as const;

    Promise.all(
      types.map(async (type) => {
        const res = await fetch(`/api/reports?type=${type}`);
        if (!res.ok) return { type, data: null };
        const data = await res.json();
        return { type, data };
      })
    ).then((results) => {
      setSummary((prev) => {
        const next = { ...prev };
        for (const { type, data } of results) {
          if (!data) continue;
          if (type === "inventory") {
            next.inventory = {
              totalItems: data.totalItems ?? 0,
              lowStockCount: (data.lowStock ?? []).length,
              totalValue: data.totalValue ?? 0,
            };
          } else if (type === "purchases") {
            next.purchases = {
              totalSpend: data.totalSpend ?? 0,
              pendingCount: data.pendingCount ?? 0,
            };
          } else if (type === "sales") {
            next.sales = {
              totalRevenue: data.totalRevenue ?? 0,
              outstanding: data.outstanding ?? 0,
              pendingCount: data.pendingCount ?? 0,
            };
          } else if (type === "production") {
            next.production = {
              totalJobs: data.totalJobs ?? 0,
              completedCount: data.completedCount ?? 0,
              inProgressCount: data.inProgressCount ?? 0,
            };
          } else if (type === "employees") {
            next.employees = {
              activeCount: data.activeCount ?? 0,
              totalMembers: (data.members ?? []).length,
            };
          }
        }
        return next;
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your business metrics
          </p>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <ReportsNav />
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <Reveal key={card.key} delay={120 + i * 80}>
            <Link href={card.href}>
              <div className="card-glass rounded-2xl p-6 h-full cursor-pointer group hover:shadow-md transition-all duration-300 hover:border-primary/20">
                <div className="flex items-center justify-between mb-5">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>

                <h3 className="text-base font-bold font-display mb-3">{card.label}</h3>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map((j) => (
                      <div key={j} className="h-5 rounded bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {card.stats(summary).map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <span
                          className={`text-sm font-semibold font-mono ${
                            "danger" in stat && stat.danger
                              ? "text-red-500"
                              : "warning" in stat && stat.warning
                                ? "text-amber-500"
                                : "text-foreground"
                          }`}
                        >
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
