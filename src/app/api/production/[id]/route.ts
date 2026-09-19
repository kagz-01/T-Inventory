import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { productionJobSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabaseAdmin
    .from("production_jobs")
    .select("*, assignedTo:users(id, name), customerOrder:customer_orders(id, customerName, orderNumber)")
    .eq("id", params.id)
    .maybeSingle();

  if (!job || job.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: materials } = await supabaseAdmin
    .from("production_materials")
    .select("*, material:materials(id, name, unit), issuedByUser:users(id, name)")
    .eq("productionJobId", params.id);

  return NextResponse.json({ ...job, materials: materials ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("production_jobs")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = productionJobSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: any = { ...parsed.data, updatedAt: new Date().toISOString() };
  if (parsed.data.status === "COMPLETED" && !existing.completedAt) {
    updateData.completedAt = new Date().toISOString();
  }

  const { data: job } = await supabaseAdmin
    .from("production_jobs")
    .update(updateData)
    .eq("id", params.id)
    .select("*, assignedTo:users(id, name), customerOrder:customer_orders(id, customerName, orderNumber)")
    .maybeSingle();

  if (job) {
    const event = parsed.data.status ? "JOB_STATUS_CHANGED" : "JOB_UPDATED";
    logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: event,
      entityType: "production_job",
      entityId: job.id,
      metadata: { name: job.title, status: parsed.data.status },
    });
  }

  return NextResponse.json(job);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("production_jobs")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabaseAdmin.from("production_jobs").delete().eq("id", params.id);
  return NextResponse.json({ success: true });
}
