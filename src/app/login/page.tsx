"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Package, AlertCircle, Mail, Lock, Crown, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RoleSection = "ADMIN" | "MANAGER" | "EMPLOYEE";

const roleConfig = {
  ADMIN: {
    label: "Boss",
    sublabel: "Organization owner",
    icon: Crown,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    ring: "ring-amber-500/20",
    activeBg: "bg-amber-500",
    activeText: "text-white",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/50",
    method: "google" as const,
  },
  MANAGER: {
    label: "Manager",
    sublabel: "Department lead",
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    ring: "ring-blue-500/20",
    activeBg: "bg-blue-500",
    activeText: "text-white",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/50",
    method: "both" as const,
  },
  EMPLOYEE: {
    label: "Team Member",
    sublabel: "Field & operations",
    icon: User,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    ring: "ring-emerald-500/20",
    activeBg: "bg-emerald-500",
    activeText: "text-white",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/50",
    method: "password" as const,
  },
};

function LoginCard() {
  const params = useSearchParams();
  const denied = params.get("error") === "AccessDenied";
  const [selectedRole, setSelectedRole] = useState<RoleSection>("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const config = roleConfig[selectedRole];
  const Icon = config.icon;

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else if (res?.url) {
      window.location.href = res.url;
    }
  }

  function handleGoogleLogin() {
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Touchline</span>
        </div>

        {/* Role selector */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(roleConfig) as RoleSection[]).map((r) => {
            const rc = roleConfig[r];
            const RIcon = rc.icon;
            const isActive = selectedRole === r;
            return (
              <button
                key={r}
                onClick={() => {
                  setSelectedRole(r);
                  setError("");
                  setEmail("");
                  setPassword("");
                }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                  isActive
                    ? `${rc.border} ${rc.bg} ${rc.ring} ring-2 shadow-sm`
                    : "border-border hover:border-muted-foreground/20"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive ? `${rc.activeBg} ${rc.activeText}` : "bg-muted text-muted-foreground"
                )}>
                  <RIcon className="h-4 w-4" />
                </div>
                <span className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {rc.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Login card */}
        <Card className={cn("border-2 transition-colors", config.border)}>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full mx-auto mb-3", config.bg)}>
                <Icon className={cn("h-6 w-6", config.color)} />
              </div>
              <h1 className="text-lg font-semibold">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedRole === "ADMIN" && "Sign in to manage your organization"}
                {selectedRole === "MANAGER" && "Sign in to oversee your team"}
                {selectedRole === "EMPLOYEE" && "Sign in to view your tasks"}
              </p>
            </div>

            {denied && (
              <div className="mb-5 flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">You haven&apos;t been invited yet</p>
                  <p className="text-muted-foreground mt-0.5">
                    Ask your admin for access, then try again.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Google sign-in (Admin + Manager) */}
            {config.method !== "password" && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:shadow-md active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
                {config.method === "both" && (
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or sign in with password</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Password form (Manager + Employee) */}
            {config.method !== "google" && (
              <form onSubmit={handleCredentialsLogin} className={cn("space-y-3", config.method === "both" ? "" : "mt-0")}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          This platform is invite-only. Contact your admin to get access.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}
