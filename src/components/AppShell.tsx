"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  // Always render without sidebar padding on landing/login
  // Sidebar offset is handled individually per page
  const { data: session } = useSession();

  return (
    <main
      className={`min-h-screen pb-20 md:pb-0 transition-all duration-200`}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
