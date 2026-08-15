import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, canManageTeam, canInviteRole } from "@/lib/permissions";
import { inviteCreateSchema } from "@/lib/validation";
import { logOrgEvent } from "@/lib/orgAudit";

const INVITE_EXPIRY_DAYS = 7;

// Lists pending/expired/revoked invites for the caller's org (accepted invites
// aren't shown here — that user just shows up in the members list instead).
export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTeam(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({
    where: { organizationId: user.organizationId, status: { not: "ACCEPTED" } },
    include: { invitedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTeam(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  if (!canInviteRole(user.role, parsed.data.role)) {
    return NextResponse.json(
      { error: "Managers can only invite Employees. Only an Admin can invite a Manager or Admin." },
      { status: 403 }
    );
  }

  const existingMember = await prisma.user.findFirst({
    where: { email, organizationId: user.organizationId },
  });
  if (existingMember) {
    return NextResponse.json({ error: "That email is already a member of your team." }, { status: 409 });
  }

  const existingPending = await prisma.invite.findFirst({
    where: { email, organizationId: user.organizationId, status: "PENDING" },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "There's already a pending invite for that email. Resend it instead." },
      { status: 409 }
    );
  }

  const invite = await prisma.invite.create({
    data: {
      email,
      role: parsed.data.role,
      organizationId: user.organizationId,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await logOrgEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    type: "INVITE_SENT",
    targetEmail: email,
    toValue: parsed.data.role,
  });

  return NextResponse.json(invite, { status: 201 });
}
