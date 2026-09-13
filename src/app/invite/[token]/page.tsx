"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type InviteInfo = {
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  organizationName: string;
  hasPassword: boolean;
};

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invites/token/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setInvite(await res.json());
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setError(null);
    const result = await signIn("credentials", {
      email: invite?.email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid password. Contact your admin for the correct password.");
      setSigningIn(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <CardContent className="py-10 text-center">
          {loading ? (
            <p className="text-sm text-muted-foreground">Checking invite...</p>
          ) : notFound ? (
            <>
              <h1 className="text-xl font-semibold mb-1">Invite not found</h1>
              <p className="text-sm text-muted-foreground">This invite link is invalid. Ask whoever invited you to send a new one.</p>
            </>
          ) : invite?.status === "REVOKED" ? (
            <>
              <h1 className="text-xl font-semibold mb-1">Invite revoked</h1>
              <p className="text-sm text-muted-foreground">This invite has been revoked. Ask your admin to send a new one.</p>
            </>
          ) : invite?.status === "EXPIRED" ? (
            <>
              <h1 className="text-xl font-semibold mb-1">Invite expired</h1>
              <p className="text-sm text-muted-foreground">This invite link has expired. Ask your admin to resend it.</p>
            </>
          ) : invite?.status === "ACCEPTED" ? (
            <>
              <h1 className="text-xl font-semibold mb-1">Already accepted</h1>
              <p className="text-sm text-muted-foreground mb-6">This invite has already been used. Just sign in below.</p>
              <div className="space-y-3">
                <Button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="w-full">
                  Continue with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>
                <form onSubmit={handlePasswordSignIn} className="space-y-3">
                  <Input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" variant="outline" className="w-full" disabled={signingIn}>{signingIn ? "Signing in..." : "Sign in with Password"}</Button>
                </form>
              </div>
            </>
          ) : invite ? (
            <>
              <h1 className="text-xl font-semibold mb-1">You've been invited to {invite.organizationName}</h1>
              <p className="text-sm text-muted-foreground mb-1">
                As <span className="font-medium">{invite.role}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-6">{invite.email}</p>
              <div className="space-y-3">
                <Button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="w-full">
                  Accept with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>
                <form onSubmit={handlePasswordSignIn} className="space-y-3">
                  <Input type="password" required placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" variant="outline" className="w-full" disabled={signingIn}>{signingIn ? "Signing in..." : "Sign in with Password"}</Button>
                </form>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Sign in with Google or ask your admin for your password.</p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
