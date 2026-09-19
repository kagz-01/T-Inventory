"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingCart, DollarSign, Hammer, Users, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const reports = [
  { href: "/reports", label: "Overview", icon: LayoutDashboard },
  { href: "/reports/inventory", label: "Inventory", icon: Package },
  { href: "/reports/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/reports/sales", label: "Sales", icon: DollarSign },
  { href: "/reports/production", label: "Production", icon: Hammer },
  { href: "/reports/employees", label: "Employees", icon: Users },
];

export default function ReportsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {reports.map((r) => {
        const isActive = pathname === r.href;
        return (
          <Link
            key={r.href}
            href={r.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <r.icon className="h-4 w-4" />
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
