import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, isAdmin } from "@/lib/permissions";
import { organizationUpdateSchema } from "@/lib/validation";
import { logOrgEvent } from "@/lib/orgAudit";

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Only Admin can update organization settings" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = organizationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data: parsed.data,
  });

  await logOrgEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    type: "ORG_UPDATED",
    note: "Organization profile updated",
  });

  return NextResponse.json(org);
}
