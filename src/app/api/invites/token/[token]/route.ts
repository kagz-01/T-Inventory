import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public (unauthenticated) — the invite landing page needs to show org context
// ("You've been invited to join Touchline as Employee") before the person signs
// in with Google. Only returns non-sensitive fields.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { organization: { select: { name: true, logoUrl: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const expired = invite.status === "PENDING" && invite.expiresAt < new Date();

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    status: expired ? "EXPIRED" : invite.status,
    organizationName: invite.organization.name,
    organizationLogoUrl: invite.organization.logoUrl,
  });
}
