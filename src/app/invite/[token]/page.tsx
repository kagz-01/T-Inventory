"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useParams } from "next/navigation";

type InviteInfo = {
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  organizationName: string;
};

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invites/token/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setInvite(await res.json());
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card max-w-sm w-full text-center py-10">
        {loading ? (
          <p className="text-sm text-gray-500">Checking invite…</p>
        ) : notFound ? (
          <>
            <h1 className="text-xl font-semibold text-brand-navy mb-1">Invite not found</h1>
            <p className="text-sm text-gray-500">
              This invite link is invalid. Ask whoever invited you to send a new one.
            </p>
          </>
        ) : invite?.status === "REVOKED" ? (
          <>
            <h1 className="text-xl font-semibold text-brand-navy mb-1">Invite revoked</h1>
            <p className="text-sm text-gray-500">
              This invite has been revoked. Ask your admin to send a new one if this was a mistake.
            </p>
          </>
        ) : invite?.status === "EXPIRED" ? (
          <>
            <h1 className="text-xl font-semibold text-brand-navy mb-1">Invite expired</h1>
            <p className="text-sm text-gray-500">
              This invite link has expired. Ask your admin to resend it.
            </p>
          </>
        ) : invite?.status === "ACCEPTED" ? (
          <>
            <h1 className="text-xl font-semibold text-brand-navy mb-1">Already accepted</h1>
            <p className="text-sm text-gray-500 mb-6">
              This invite has already been used. Just sign in below.
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="btn-primary w-full"
            >
              Continue with Google
            </button>
          </>
        ) : invite ? (
          <>
            <h1 className="text-xl font-semibold text-brand-navy mb-1">
              You've been invited to {invite.organizationName}
            </h1>
            <p className="text-sm text-gray-500 mb-1">
              As <span className="font-medium text-gray-700">{invite.role}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">{invite.email}</p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="btn-primary w-full"
            >
              Accept with Google
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Sign in using this exact email address to accept the invite.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
