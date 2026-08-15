import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { Role } from "@prisma/client";

const STALL_HOURS = 48; // task with no activity for this long gets flagged

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isEmployee = user.role === Role.EMPLOYEE;

  const [materials, openTasks, recentEvents, pendingInviteCount] = await Promise.all([
    prisma.material.findMany({ where: { organizationId: user.organizationId } }),
    prisma.sourcingTask.findMany({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ["DISTRIBUTED", "UNAVAILABLE"] },
        // Employees only ever see their own open tasks on the dashboard —
        // "My Tasks" front and center, not the whole org's board.
        assignedToId: isEmployee ? user.id : undefined,
      },
      include: {
        material: true,
        assignedTo: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.taskEvent.findMany({
      take: 20,
      where: { task: { organizationId: user.organizationId } },
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    isEmployee
      ? Promise.resolve(0)
      : prisma.invite.count({ where: { organizationId: user.organizationId, status: "PENDING" } }),
  ]);

  const lowStock = materials.filter((m) => m.stockOnHand <= m.reorderThreshold);

  const stallCutoff = new Date(Date.now() - STALL_HOURS * 60 * 60 * 1000);
  const stalledTasks = openTasks.filter((t) => t.lastActivityAt < stallCutoff);

  const byStatus = openTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    role: user.role,
    lowStock: isEmployee ? [] : lowStock,
    stalledTasks,
    openTaskCount: openTasks.length,
    tasksByStatus: byStatus,
    recentEvents: isEmployee ? [] : recentEvents,
    myOpenTasks: isEmployee ? openTasks : undefined,
    pendingInviteCount,
  });
}
