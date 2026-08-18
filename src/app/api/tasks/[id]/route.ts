import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, isAdmin } from "@/lib/permissions";
import { taskStatusUpdateSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: task } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  if (!task || task.organizationId !== user.organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Enrich with related records
  if (task.materialId) {
    const { data: m } = await supabaseAdmin.from('materials').select('id,name,unit').eq('id', task.materialId).maybeSingle();
    (task as any).material = m ?? null;
  }
  if (task.vendorId) {
    const { data: v } = await supabaseAdmin.from('vendors').select('id,name').eq('id', task.vendorId).maybeSingle();
    (task as any).vendor = v ?? null;
  }
  if (task.brandingVendorId) {
    const { data: b } = await supabaseAdmin.from('vendors').select('id,name').eq('id', task.brandingVendorId).maybeSingle();
    (task as any).brandingVendor = b ?? null;
  }
  if (task.projectId) {
    const { data: p } = await supabaseAdmin.from('projects').select('id,name').eq('id', task.projectId).maybeSingle();
    (task as any).project = p ?? null;
  }
  if (task.assignedToId) {
    const { data: a } = await supabaseAdmin.from('users').select('id,name,image,phone').eq('id', task.assignedToId).maybeSingle();
    (task as any).assignedTo = a ?? null;
  }
  if (task.createdById) {
    const { data: c } = await supabaseAdmin.from('users').select('id,name').eq('id', task.createdById).maybeSingle();
    (task as any).createdBy = c ?? null;
  }
  const { data: photos } = await supabaseAdmin.from('task_photos').select('*').eq('taskId', task.id).order('createdAt', { ascending: false });
  (task as any).photos = photos ?? [];
  const { data: distributions } = await supabaseAdmin.from('distribution_records').select('*, deliveredBy:users(id,name)').eq('taskId', task.id).order('deliveryDate', { ascending: false });
  (task as any).distributions = distributions ?? [];
  const { data: comments } = await supabaseAdmin.from('task_comments').select('*, author:users(id,name,image)').eq('taskId', task.id).order('createdAt', { ascending: true });
  (task as any).comments = comments ?? [];
  const { data: events } = await supabaseAdmin.from('task_events').select('*, actor:users(id,name,image)').eq('taskId', task.id).order('createdAt', { ascending: true });
  (task as any).events = events ?? [];

  return NextResponse.json(task);
}

// Updates status and the details relevant to whichever stage the task is entering:
// Searching -> Found (vendor + price) -> Sample Collected -> Awaiting Approval -> Purchased
// -> Branding In Progress (branding vendor + method + cost + artwork) -> Branding Complete
// -> Distributed (see /distribute route for the actual per-recipient records)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = taskStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.vendorId) {
    const { data: vendor } = await supabaseAdmin.from('vendors').select('*').eq('id', parsed.data.vendorId).maybeSingle();
    if (!vendor || vendor.organizationId !== user.organizationId) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  if (parsed.data.brandingVendorId) {
    const { data: bVendor } = await supabaseAdmin.from('vendors').select('*').eq('id', parsed.data.brandingVendorId).maybeSingle();
    if (!bVendor || bVendor.organizationId !== user.organizationId) return NextResponse.json({ error: "Branding vendor not found" }, { status: 404 });
  }

  // PURCHASED: raw/blank stock arrives - increment stock on hand.
  const isPurchaseCompletion = parsed.data.status === "PURCHASED" && existing.status !== "PURCHASED";

  const updatePayload: any = {
    status: parsed.data.status,
    vendorId: parsed.data.vendorId ?? existing.vendorId,
    quotedPrice: parsed.data.quotedPrice ?? existing.quotedPrice,
    brandingVendorId: parsed.data.brandingVendorId ?? existing.brandingVendorId,
    brandingMethod: parsed.data.brandingMethod ?? existing.brandingMethod,
    brandingCost: parsed.data.brandingCost ?? existing.brandingCost,
    artworkUrl: parsed.data.artworkUrl ?? existing.artworkUrl,
  };
  const { data: task } = await supabaseAdmin.from('sourcing_tasks').update(updatePayload).eq('id', params.id).select().maybeSingle();

  await logTaskEvent({
    taskId: task.id,
    actorId: user.id,
    type: "STATUS_CHANGED",
    fromValue: existing.status,
    toValue: parsed.data.status,
    note: parsed.data.note,
  });

  if (parsed.data.vendorId && parsed.data.vendorId !== existing.vendorId) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "VENDOR_LINKED", toValue: parsed.data.vendorId });
  }
  if (parsed.data.brandingVendorId && parsed.data.brandingVendorId !== existing.brandingVendorId) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "BRANDING_VENDOR_LINKED", toValue: parsed.data.brandingVendorId });
  }
  if (parsed.data.artworkUrl && parsed.data.artworkUrl !== existing.artworkUrl) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "ARTWORK_UPLOADED" });
  }

  if (isPurchaseCompletion && task.materialId) {
    const { data: mat } = await supabaseAdmin.from('materials').select('id,stockOnHand').eq('id', task.materialId).maybeSingle();
    const newStock = (mat?.stockOnHand ?? 0) + task.quantityNeeded;
    await supabaseAdmin.from('materials').update({ stockOnHand: newStock }).eq('id', task.materialId);
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Only Admin can delete tasks" }, { status: 403 });
  }

  const { data: existingToDelete } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('id', params.id).maybeSingle();
  if (!existingToDelete || existingToDelete.organizationId !== user.organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await supabaseAdmin.from('sourcing_tasks').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}
