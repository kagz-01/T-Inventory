import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { distributionSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";

// Records a hand-over of branded goods to one recipient. A single task can have
// several distribution records (e.g. 200 branded caps split across 3 offices for
// one tender) - the task only flips to DISTRIBUTED once the total quantity
// distributed reaches the quantity originally needed.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = distributionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.sourcingTask.findUnique({
    where: { id: params.id },
    include: { distributions: true },
  });
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const record = await prisma.distributionRecord.create({
    data: {
      taskId: task.id,
      organizationId: user.organizationId,
      recipientName: parsed.data.recipientName,
      recipientContact: parsed.data.recipientContact,
      quantity: parsed.data.quantity,
      deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : new Date(),
      proofPhotoUrl: parsed.data.proofPhotoUrl,
      notes: parsed.data.notes,
      deliveredById: user.id,
    },
  });

  // Branded goods leave inventory once handed over.
  await prisma.material.update({
    where: { id: task.materialId },
    data: { stockOnHand: { decrement: parsed.data.quantity } },
  });

  await logTaskEvent({
    taskId: task.id,
    actorId: user.id,
    type: "DISTRIBUTION_RECORDED",
    toValue: parsed.data.recipientName,
    note: `${parsed.data.quantity} units`,
  });

  // If cumulative distributed quantity now covers what was needed, close out the task.
  const totalDistributed =
    task.distributions.reduce((sum, d) => sum + d.quantity, 0) + parsed.data.quantity;

  if (totalDistributed >= task.quantityNeeded && task.status !== "DISTRIBUTED") {
    await prisma.sourcingTask.update({ where: { id: task.id }, data: { status: "DISTRIBUTED" } });
    await logTaskEvent({
      taskId: task.id,
      actorId: user.id,
      type: "STATUS_CHANGED",
      fromValue: task.status,
      toValue: "DISTRIBUTED",
      note: "Fully distributed",
    });
  }

  return NextResponse.json(record, { status: 201 });
}
