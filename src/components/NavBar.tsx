"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/tasks", label: "Sourcing Tasks", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/leads", label: "Leads", roles: ["ADMIN", "MANAGER"] },
  { href: "/materials", label: "Materials", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/vendors", label: "Vendors", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/employees", label: "Employees", roles: ["ADMIN", "MANAGER"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN", "MANAGER"] },
];

// Thumb-reach labels for the mobile bottom tab bar — shorter than the desktop nav.
const mobileTabs = [
  { href: "/dashboard", label: "Home", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/tasks", label: "Tasks", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/materials", label: "Materials", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/vendors", label: "Vendors", roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN", "MANAGER"] },
  { href: "/employees", label: "Team", roles: ["EMPLOYEE"] },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "EMPLOYEE";

  if (!session?.user) return null;

  return (
    <>
      <header className="bg-brand-navy text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm tracking-wide">Signage Materials Platform</span>
            <nav className="hidden md:flex items-center gap-4">
              {links
                .filter((l) => l.roles.includes(role))
                .map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`text-sm px-2 py-1 rounded ${
                      pathname?.startsWith(l.href) ? "bg-white/15 font-medium" : "text-white/80 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 hidden sm:inline">{session.user.name} · {role}</span>
            <button onClick={() => signOut()} className="text-xs text-white/80 hover:text-white underline">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar — thumb-reach for field staff, fixed to the bottom of the screen. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 bg-brand-navy border-t border-white/10 flex">
        {mobileTabs
          .filter((l) => l.roles.includes(role))
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 text-center py-2.5 text-[11px] ${
                pathname?.startsWith(l.href) ? "text-white font-medium border-t border-white/20 pt-2" : "text-white/60"
              }`}
            >
              {l.label}
            </Link>
          ))}
      </nav>
    </>
  );
}
