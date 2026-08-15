import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { z } from "zod";

const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tasks: {
        include: {
          material: true,
          vendor: true,
          assignedTo: { select: { id: true, name: true, image: true } },
        },
        orderBy: [{ priority: "desc" }, { lastActivityAt: "desc" }],
      },
    },
  });
  if (!project || project.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === "DISTRIBUTED").length;
  const totalSpend = project.tasks.reduce((sum, t) => sum + (t.quotedPrice || 0), 0);

  return NextResponse.json({ ...project, totalTasks, completedTasks, totalSpend });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.project.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(project);
}
