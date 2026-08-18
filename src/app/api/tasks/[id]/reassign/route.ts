import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canReassignTask } from "@/lib/permissions";
import { reassignSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";
import { Role } from "@/types/dbEnums";

// Hands a task off from its current assignee to a new employee, WITHOUT losing
// any history: previous vendor visits, prices quoted, photos, and comments all
// stay attached to the task. The new assignee sees everything the previous
// person gathered and can continue from wherever the task was left.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canReassignTask(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = reassignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: task } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A plain Employee may only hand off a task that is currently assigned to them.
  // Admin/Manager can reassign any task (e.g. covering for someone who's sick and
  // hasn't logged in to hand it off themselves).
  if (user.role === Role.EMPLOYEE && task.assignedToId !== user.id) {
    return NextResponse.json(
      { error: "You can only reassign tasks currently assigned to you" },
      { status: 403 }
    );
  }

  // New assignee must belong to the same org.
  const { data: newAssignee } = await supabaseAdmin.from('users').select('*').eq('id', parsed.data.newAssigneeId).maybeSingle();
  if (!newAssignee || newAssignee.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "New assignee not found" }, { status: 404 });
  }

  const previousAssigneeId = task.assignedToId;

  const { data: updated } = await supabaseAdmin.from('sourcing_tasks').update({ assignedToId: parsed.data.newAssigneeId, status: "REASSIGNED" }).eq('id', params.id).select().maybeSingle();

  // Log as REASSIGNED (or ASSIGNED, if it had no prior assignee) so the timeline
  // clearly shows the handoff and who it went to.
  await logTaskEvent({
    taskId: task.id,
    actorId: user.id,
    type: previousAssigneeId ? "REASSIGNED" : "ASSIGNED",
    fromValue: previousAssigneeId ?? undefined,
    toValue: parsed.data.newAssigneeId,
    note: parsed.data.reason,
  });

  return NextResponse.json(updated);
}
