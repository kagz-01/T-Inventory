import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().optional(),
  description: z.string().optional(),
});

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    include: {
      tasks: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withProgress = projects.map((p) => ({
    ...p,
    totalTasks: p.tasks.length,
    completedTasks: p.tasks.filter((t) => t.status === "DISTRIBUTED").length,
  }));

  return NextResponse.json(withProgress);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, organizationId: user.organizationId },
  });
  return NextResponse.json(project, { status: 201 });
}
