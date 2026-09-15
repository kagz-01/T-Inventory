"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Package, AlertCircle, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginCard() {
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

  function handleGoogleLogin() {
    signIn("google", { callbackUrl: "/dashboard" });
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
            <h1 className="text-xl font-bold font-display">Sign in to your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Boss? Use Google. Team member? Use your email & password.
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

          {/* Google sign-in */}
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-300 hover:bg-accent hover:shadow-md hover:border-border active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">or sign in with password</span>
            </div>
          </div>

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
            <span className="font-medium text-foreground">Boss?</span> Your email is pre-registered — just click Google sign-in.
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Team member?</span> Ask your admin for an invite, then use the password form.
          </p>
        </div>
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
