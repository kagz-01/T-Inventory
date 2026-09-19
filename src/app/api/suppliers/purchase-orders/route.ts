import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { purchaseOrderSchema } from "@/lib/validation";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const supplierId = searchParams.get("supplierId") || undefined;

  let q = supabaseAdmin
    .from("purchase_orders")
    .select("*, supplier:vendors(id, name)")
    .eq("organizationId", user.organizationId)
    .order("createdAt", { ascending: false });

  if (status) q = q.eq("status", status);
  if (supplierId) q = q.eq("supplierId", supplierId);

  const { data: orders } = await q;
  return NextResponse.json(orders ?? []);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = purchaseOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: po } = await supabaseAdmin
    .from("purchase_orders")
    .insert({
      id: randomUUID(),
      ...parsed.data,
      status: parsed.data.status ?? "DRAFT",
      organizationId: user.organizationId,
      createdById: user.id,
    })
    .select("*, supplier:vendors(id, name)")
    .maybeSingle();

  if (po) {
    logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: "PO_CREATED",
      entityType: "purchase_order",
      entityId: po.id,
      metadata: { name: `PO for ${parsed.data.supplierId}` },
    });
  }

  return NextResponse.json(po, { status: 201 });
}
