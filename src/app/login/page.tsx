"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginCard() {
  const params = useSearchParams();
  const denied = params.get("error") === "AccessDenied";

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card max-w-sm w-full text-center py-10">
        <h1 className="text-xl font-semibold text-brand-navy mb-1">Signage Materials Platform</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in with your company Google account</p>

        {denied && (
          <div className="mb-5 text-left text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2">
            <p className="font-medium">You haven't been invited yet.</p>
            <p className="mt-1 text-amber-700">
              This platform is invite-only. Ask your admin to send you an invite to the
              email address you tried signing in with, then try again.
            </p>
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="btn-primary w-full"
        >
          Continue with Google
        </button>
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
