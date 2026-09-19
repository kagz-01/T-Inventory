import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { customerOrderSchema } from "@/lib/validation";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const orderType = searchParams.get("orderType") || undefined;
  const search = searchParams.get("search") || undefined;

  let q = supabaseAdmin
    .from("customer_orders")
    .select("*")
    .eq("organizationId", user.organizationId)
    .order("createdAt", { ascending: false });

  if (status) q = q.eq("status", status);
  if (orderType) q = q.eq("orderType", orderType);
  if (search) q = q.ilike("customerName", `%${search}%`);

  const { data: orders } = await q;
  return NextResponse.json(orders ?? []);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = customerOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from("customer_orders")
    .insert({
      id: randomUUID(),
      ...parsed.data,
      status: parsed.data.status ?? "ENQUIRY",
      organizationId: user.organizationId,
      createdById: user.id,
    })
    .select()
    .maybeSingle();

  if (order) {
    logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: "ORDER_CREATED",
      entityType: "customer_order",
      entityId: order.id,
      metadata: { name: parsed.data.customerName, orderType: parsed.data.orderType },
    });
  }

  return NextResponse.json(order, { status: 201 });
}
