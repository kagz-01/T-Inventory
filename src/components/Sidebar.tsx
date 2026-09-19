"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ListTodo,
  Package,
  Truck,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Target,
  Search,
  ClipboardList,
  Hammer,
  Crown,
  Shield,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/orders", label: "Orders", icon: ClipboardList, roles: ["ADMIN", "MANAGER"] },
  { href: "/production", label: "Production", icon: Hammer, roles: ["ADMIN", "MANAGER"] },
  { href: "/tasks", label: "Tasks", icon: ListTodo, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/materials", label: "Materials", icon: Package, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/employees", label: "Team", icon: Users, roles: ["ADMIN", "MANAGER"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
];

const mobileTabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/orders", label: "Orders", icon: ClipboardList, roles: ["ADMIN", "MANAGER"] },
  { href: "/tasks", label: "Tasks", icon: ListTodo, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/materials", label: "Stock", icon: Package, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/settings", label: "More", icon: Settings, roles: ["ADMIN"] },
  { href: "/employees", label: "Team", icon: Users, roles: ["ADMIN", "MANAGER"] },
];

const roleIcons: Record<string, React.ElementType> = {
  ADMIN: Crown,
  MANAGER: Shield,
  EMPLOYEE: UserCheck,
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-8 w-8" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "EMPLOYEE";
  if (!session?.user) return null;

  const RoleIcon = roleIcons[role] || UserCheck;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[240px] flex-col border-r border-border/50 glass-nav">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border/50 px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-md group-hover:shadow-primary/20">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight font-display">Touchline</span>
          </Link>
        </div>

        {/* Search trigger */}
        <div className="px-3 pt-3">
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-all duration-300 hover:bg-muted/60 hover:border-border"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">Ctrl</span>K
            </kbd>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-0.5">
            {navItems
              .filter((item) => item.roles.includes(role))
              .map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                      isActive
                        ? "nav-active"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border/50 px-3 py-3">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <div className="flex items-center gap-1">
                <RoleIcon className={cn(
                  "h-3 w-3",
                  role === "ADMIN" && "text-amber-500",
                  role === "MANAGER" && "text-blue-500",
                  role === "EMPLOYEE" && "text-emerald-500"
                )} />
                <p className="text-xs text-muted-foreground truncate">{role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/50 glass-nav">
        <div className="flex">
          {mobileTabs
            .filter((l) => l.roles.includes(role))
            .map((l) => {
              const isActive = pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground",
                    "active:scale-95"
                  )}
                >
                  <l.icon className="h-5 w-5" />
                  <span>{l.label}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    </>
  );
}
