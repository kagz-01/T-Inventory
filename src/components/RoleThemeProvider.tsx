"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function RoleThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    const html = document.documentElement;
    if (role) {
      html.setAttribute("data-role", role);
    } else {
      html.removeAttribute("data-role");
    }
  }, [role]);

  return <>{children}</>;
}
