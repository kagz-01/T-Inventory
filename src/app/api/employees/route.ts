import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";

// Manual "pre-create by email" has been replaced by the invite system
// (see /api/invites) — members now only ever appear here once they've
// accepted an invite (or are the org's bootstrap admin) and signed in.
export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      role: true,
      active: true,
      tasksAssigned: {
        where: {
          status: { notIn: ["DISTRIBUTED", "UNAVAILABLE"] },
        },
        select: { id: true, title: true, status: true },
      },
    },
  });

  return NextResponse.json(employees);
}
