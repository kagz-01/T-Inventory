import { prisma } from "@/lib/prisma";
import { TaskEventType } from "@prisma/client";

export async function logTaskEvent(params: {
  taskId: string;
  actorId: string;
  type: TaskEventType;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
}) {
  await prisma.taskEvent.create({
    data: {
      taskId: params.taskId,
      actorId: params.actorId,
      type: params.type,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
      note: params.note ?? null,
    },
  });
  await prisma.sourcingTask.update({
    where: { id: params.taskId },
    data: { lastActivityAt: new Date() },
  });
}
