import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/taskEvents";
import { Role } from "@/types/dbEnums";
import { z } from "zod";

const convertSchema = z.object({
  materialId: z.string(),
  quantityNeeded: z.number().positive(),
  title: z.string().optional(),
  projectId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

// Turns a public-site enquiry into a real SourcingTask, closing the loop
// between "someone filled in the quote form" and "the team is actually
// working on it." The lead itself isn't deleted - it's marked converted
// and linked to the task it became, so the original enquiry details
// (contact info, message, preferred date) stay attached for reference.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === Role.EMPLOYEE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: lead } = await supabaseAdmin.from('leads').select('*').eq('id', params.id).maybeSingle();
  if (!lead || lead.organization_id !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (lead.status === "converted") {
    return NextResponse.json({ error: "This lead has already been converted" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = convertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: material } = await supabaseAdmin.from('materials').select('*').eq('id', parsed.data.materialId).maybeSingle();
  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Invalid material" }, { status: 400 });
  }
  if (parsed.data.assignedToId) {
    const { data: assignee } = await supabaseAdmin.from('users').select('*').eq('id', parsed.data.assignedToId).maybeSingle();
    if (!assignee || assignee.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
  }

  const title =
    parsed.data.title ||
    `${lead.service || "Enquiry"} for ${lead.fullName} (${lead.brand})`;

  const { data: task } = await supabaseAdmin.from('sourcing_tasks').insert({
    organizationId: user.organizationId,
    title,
    materialId: parsed.data.materialId,
    quantityNeeded: parsed.data.quantityNeeded,
    priority: parsed.data.priority,
    projectId: parsed.data.projectId,
    assignedToId: parsed.data.assignedToId,
    status: parsed.data.assignedToId ? 'ASSIGNED' : 'PENDING',
    createdById: user.id,
  }).select().maybeSingle();

  const contactNote = [
    `Converted from a website enquiry (${lead.brand}).`,
    `Contact: ${lead.fullName} \u2014 ${lead.phone}${lead.email ? ` \u2014 ${lead.email}` : ""}`,
    lead.location ? `Location: ${lead.location}` : null,
    lead.preferredDate ? `Preferred date: ${lead.preferredDate.toISOString().slice(0, 10)}` : null,
    lead.message ? `Message: ${lead.message}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  await logTaskEvent({ taskId: task.id, actorId: user.id, type: "CREATED", note: contactNote });
  if (parsed.data.assignedToId) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "ASSIGNED", toValue: parsed.data.assignedToId });
  }

  await supabaseAdmin.from('task_comments').insert({ taskId: task.id, authorId: user.id, body: contactNote });

  await supabaseAdmin.from('leads').update({ status: 'converted', converted_task_id: task.id }).eq('id', lead.id);

  return NextResponse.json(task, { status: 201 });
}
