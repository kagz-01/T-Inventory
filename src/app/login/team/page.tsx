"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Package, AlertCircle, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

function TeamLoginCard() {
  const params = useSearchParams();
  const denied = params.get("error") === "AccessDenied";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight font-display">Touchline</span>
        </div>

        {/* Card */}
        <div className="card-glass rounded-2xl p-6 animate-fade-in-up border-2 border-border">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold font-display">Team Sign In</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Use your email & password to sign in.
            </p>
          </div>

          {denied && (
            <div className="mb-5 flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">You haven&apos;t been invited yet</p>
                <p className="text-muted-foreground mt-0.5">
                  Ask your admin for an invitation, then try again.
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

          {/* Password form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-3">
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
        </div>

        {/* Helper text */}
        <div className="mt-6 space-y-2 text-center animate-fade-in" style={{ animationDelay: "240ms" }}>
          <p className="text-xs text-muted-foreground">
            This platform is invite-only.
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Admin?</span>{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Sign in with Google
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TeamLoginPage() {
  return (
    <Suspense fallback={null}>
      <TeamLoginCard />
    </Suspense>
  );
}
