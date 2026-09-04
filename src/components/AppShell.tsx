"use client";

import { useSession } from "next-auth/react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const hasSidebar = !!session?.user;

  return (
    <main
      className={`min-h-screen pb-20 md:pb-0 transition-all duration-200 ${
        hasSidebar ? "md:pl-[240px]" : ""
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
