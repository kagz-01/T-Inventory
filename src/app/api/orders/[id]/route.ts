import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { customerOrderSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: order } = await supabaseAdmin
    .from("customer_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!order || order.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from("customer_order_items")
    .select("*")
    .eq("customerOrderId", params.id);

  const { data: tasks } = await supabaseAdmin
    .from("sourcing_tasks")
    .select("id, title, status, assignedTo:users(id, name)")
    .eq("customerOrderId", params.id);

  const { data: jobs } = await supabaseAdmin
    .from("production_jobs")
    .select("id, title, status, assignedTo:users(id, name), dueDate, completedAt")
    .eq("customerOrderId", params.id);

  return NextResponse.json({
    ...order,
    items: items ?? [],
    tasks: tasks ?? [],
    jobs: jobs ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("customer_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = customerOrderSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: order } = await supabaseAdmin
    .from("customer_orders")
    .update({ ...parsed.data, updatedAt: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (order) {
    const event = parsed.data.status ? "ORDER_STATUS_CHANGED" : "ORDER_UPDATED";
    logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: event,
      entityType: "customer_order",
      entityId: order.id,
      metadata: { name: order.customerName, status: parsed.data.status },
    });
  }

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("customer_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabaseAdmin.from("customer_orders").delete().eq("id", params.id);
  return NextResponse.json({ success: true });
}
