import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { taskSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const assignedToId = searchParams.get("assignedToId") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const mine = searchParams.get("mine") === "true";

  const tasks = await prisma.sourcingTask.findMany({
    where: {
      organizationId: user.organizationId,
      status: status ? (status as any) : undefined,
      projectId: projectId || undefined,
      // Field employees only ever see their own tasks unless explicitly browsing all as Manager/Admin.
      assignedToId:
        mine || user.role === Role.EMPLOYEE ? user.id : assignedToId || undefined,
    },
    include: {
      material: true,
      vendor: true,
      assignedTo: { select: { id: true, name: true, image: true } },
      createdBy: { select: { id: true, name: true } },
      project: true,
      photos: { take: 1 },
      _count: { select: { events: true, comments: true } },
    },
    orderBy: [{ priority: "desc" }, { lastActivityAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // material, project, and assignee (if given) must all belong to the caller's org.
  const material = await prisma.material.findUnique({ where: { id: parsed.data.materialId } });
  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }
  if (parsed.data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
    if (!project || project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }
  if (parsed.data.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
    if (!assignee || assignee.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }
  }

  const task = await prisma.sourcingTask.create({
    data: {
      ...parsed.data,
      organizationId: user.organizationId,
      status: parsed.data.assignedToId ? "ASSIGNED" : "PENDING",
      createdById: user.id,
    },
  });

  await logTaskEvent({
    taskId: task.id,
    actorId: user.id,
    type: "CREATED",
    note: parsed.data.assignedToId ? "Task created and assigned" : "Task created",
  });

  if (parsed.data.assignedToId) {
    await logTaskEvent({
      taskId: task.id,
      actorId: user.id,
      type: "ASSIGNED",
      toValue: parsed.data.assignedToId,
    });
  }

  return NextResponse.json(task, { status: 201 });
}
