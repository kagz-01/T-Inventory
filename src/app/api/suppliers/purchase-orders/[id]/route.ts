import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { purchaseOrderSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: po } = await supabaseAdmin
    .from("purchase_orders")
    .select("*, supplier:vendors(id, name, contactName, phone, email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!po || po.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from("purchase_order_items")
    .select("*, material:materials(id, name, unit)")
    .eq("purchaseOrderId", params.id);

  return NextResponse.json({ ...po, items: items ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("purchase_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = purchaseOrderSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: po } = await supabaseAdmin
    .from("purchase_orders")
    .update({ ...parsed.data, updatedAt: new Date().toISOString() })
    .eq("id", params.id)
    .select("*, supplier:vendors(id, name)")
    .maybeSingle();

  if (po) {
    const event = parsed.data.status ? "PO_STATUS_CHANGED" : "PO_UPDATED";
    logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: event,
      entityType: "purchase_order",
      entityId: po.id,
      metadata: { status: parsed.data.status },
    });
  }

  return NextResponse.json(po);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("purchase_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabaseAdmin.from("purchase_orders").delete().eq("id", params.id);
  return NextResponse.json({ success: true });
}
