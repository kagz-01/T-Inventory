import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, isAdmin } from "@/lib/permissions";
import { employeeRoleUpdateSchema } from "@/lib/validation";
import { logOrgEvent } from "@/lib/orgAudit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      tasksAssigned: {
        orderBy: { updatedAt: "desc" },
        include: { material: true },
      },
    },
  });
  if (!employee || employee.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Only Admin can change roles or access" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.id === user.id) {
    return NextResponse.json({ error: "You can't change your own role or access here" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = employeeRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const employee = await prisma.user.update({ where: { id: params.id }, data: parsed.data });

  if (parsed.data.role && parsed.data.role !== existing.role) {
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "ROLE_CHANGED",
      targetEmail: existing.email,
      fromValue: existing.role,
      toValue: parsed.data.role,
    });
  }

  // Deactivating a user should immediately kill their sessions, not just hide
  // them from lists — otherwise they keep working until their session expires.
  if (parsed.data.active === false && existing.active) {
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "MEMBER_DEACTIVATED",
      targetEmail: existing.email,
    });
  }
  if (parsed.data.active === true && !existing.active) {
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "MEMBER_REACTIVATED",
      targetEmail: existing.email,
    });
  }

  return NextResponse.json(employee);
}
