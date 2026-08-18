import { supabaseAdmin } from "@/lib/supabase";
import { TaskEventType } from "@/types/dbEnums";

export async function logTaskEvent(params: {
  taskId: string;
  actorId: string;
  type: TaskEventType | string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
}) {
  await supabaseAdmin.from('task_events').insert({
    taskId: params.taskId,
    actorId: params.actorId,
    type: params.type,
    fromValue: params.fromValue ?? null,
    toValue: params.toValue ?? null,
    note: params.note ?? null,
  });
  await supabaseAdmin.from('sourcing_tasks').update({ lastActivityAt: new Date().toISOString() }).eq('id', params.taskId);
}

