import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["new", "contacted", "converted", "closed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === Role.EMPLOYEE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // "converted" is only ever set by the /convert endpoint, which also links
  // the resulting task - block it here so a lead can't look converted
  // without actually having a task behind it.
  if (parsed.data.status === "converted") {
    return NextResponse.json(
      { error: "Use the Convert to Task action instead" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.update({ where: { id: params.id }, data: { status: parsed.data.status } });
  return NextResponse.json(lead);
}
