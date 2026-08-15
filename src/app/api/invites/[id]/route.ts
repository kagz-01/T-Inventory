import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, canManageTeam, canInviteRole } from "@/lib/permissions";
import { logOrgEvent } from "@/lib/orgAudit";
import { z } from "zod";

const INVITE_EXPIRY_DAYS = 7;

const patchSchema = z.object({
  action: z.enum(["resend", "changeRole"]),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
});

async function loadOrgScopedInvite(id: string, organizationId: string) {
  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite || invite.organizationId !== organizationId) return null;
  return invite;
}

// Resend (bumps expiry, keeps token so any previously-shared link stays valid)
// or change the intended role of a still-pending invite.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTeam(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await loadOrgScopedInvite(params.id, user.organizationId);
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending invites can be modified" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "resend") {
    const updated = await prisma.invite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) },
    });
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "INVITE_RESENT",
      targetEmail: invite.email,
    });
    return NextResponse.json(updated);
  }

  // changeRole
  if (!parsed.data.role) {
    return NextResponse.json({ error: "role is required for changeRole" }, { status: 400 });
  }
  if (!canInviteRole(user.role, parsed.data.role)) {
    return NextResponse.json(
      { error: "You don't have permission to set that role." },
      { status: 403 }
    );
  }
  const updated = await prisma.invite.update({
    where: { id: invite.id },
    data: { role: parsed.data.role },
  });
  await logOrgEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    type: "INVITE_SENT",
    targetEmail: invite.email,
    fromValue: invite.role,
    toValue: parsed.data.role,
    note: "Role changed on pending invite",
  });
  return NextResponse.json(updated);
}

// Revoke a pending invite so the link/email can no longer be used to join.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTeam(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await loadOrgScopedInvite(params.id, user.organizationId);
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.invite.update({ where: { id: invite.id }, data: { status: "REVOKED" } });

  await logOrgEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    type: "INVITE_REVOKED",
    targetEmail: invite.email,
  });

  return NextResponse.json({ success: true });
}
