import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
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

  const { data: task } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  const { data: distributions } = await supabaseAdmin.from('distribution_records').select('*').eq('taskId', params.id);
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: record } = await supabaseAdmin.from('distribution_records').insert({
    taskId: task.id,
    organizationId: user.organizationId,
    recipientName: parsed.data.recipientName,
    recipientContact: parsed.data.recipientContact,
    quantity: parsed.data.quantity,
    deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : new Date(),
    proofPhotoUrl: parsed.data.proofPhotoUrl,
    notes: parsed.data.notes,
    deliveredById: user.id,
  }).select().maybeSingle();

  // Branded goods leave inventory once handed over.
  if (task.materialId) {
    const { data: mat } = await supabaseAdmin.from('materials').select('id,stockOnHand').eq('id', task.materialId).maybeSingle();
    const newStock = (mat?.stockOnHand ?? 0) - parsed.data.quantity;
    await supabaseAdmin.from('materials').update({ stockOnHand: newStock }).eq('id', task.materialId);
  }

  await logTaskEvent({
    taskId: task.id,
    actorId: user.id,
    type: "DISTRIBUTION_RECORDED",
    toValue: parsed.data.recipientName,
    note: `${parsed.data.quantity} units`,
  });

  // If cumulative distributed quantity now covers what was needed, close out the task.
  const totalDistributed = (distributions ?? []).reduce((sum, d) => sum + d.quantity, 0) + parsed.data.quantity;
  if (totalDistributed >= task.quantityNeeded && task.status !== "DISTRIBUTED") {
    await supabaseAdmin.from('sourcing_tasks').update({ status: "DISTRIBUTED" }).eq('id', task.id);
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "STATUS_CHANGED", fromValue: task.status, toValue: "DISTRIBUTED", note: "Fully distributed" });
  }

  return NextResponse.json(record, { status: 201 });
}
