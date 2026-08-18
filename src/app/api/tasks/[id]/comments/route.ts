import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { commentSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: task } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: comment } = await supabaseAdmin.from('task_comments').insert({ taskId: params.id, authorId: user.id, body: parsed.data.body }).select().maybeSingle();

  await logTaskEvent({
    taskId: params.id,
    actorId: user.id,
    type: "COMMENT_ADDED",
  });

  return NextResponse.json(comment, { status: 201 });
}
