import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { customerOrderItemSchema } from "@/lib/validation";
import { randomUUID } from "crypto";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items } = await supabaseAdmin
    .from("customer_order_items")
    .select("*")
    .eq("customerOrderId", params.id);

  return NextResponse.json(items ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("customer_orders")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = customerOrderItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: item } = await supabaseAdmin
    .from("customer_order_items")
    .insert({ id: randomUUID(), customerOrderId: params.id, ...parsed.data })
    .select()
    .maybeSingle();

  return NextResponse.json(item, { status: 201 });
}
