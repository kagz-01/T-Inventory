"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AppShell({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  const { data: session } = useSession();
  const [hasSidebar, setHasSidebar] = useState(isAuthenticated);

  useEffect(() => {
    if (session?.user) {
      setHasSidebar(true);
    } else {
      setHasSidebar(false);
    }
  }, [session?.user]);

  if (!hasSidebar) {
    return <>{children}</>;
  }

  return (
    <main
      className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 ${hasSidebar ? "md:pl-[240px]" : ""}`}
    >
      <div className="w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        {children}
      </div>
    </main>
  );
}
