import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === Role.EMPLOYEE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined; // new | contacted | converted | closed

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      status: status || undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}
