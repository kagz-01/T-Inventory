import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser } from "@/lib/permissions";
import { commentSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.sourcingTask.findUnique({ where: { id: params.id } });
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await prisma.taskComment.create({
    data: { taskId: params.id, authorId: user.id, body: parsed.data.body },
  });

  await logTaskEvent({
    taskId: params.id,
    actorId: user.id,
    type: "COMMENT_ADDED",
  });

  return NextResponse.json(comment, { status: 201 });
}
