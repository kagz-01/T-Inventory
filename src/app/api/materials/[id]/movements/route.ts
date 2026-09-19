import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { stockMovementSchema } from "@/lib/validation";
import { randomUUID } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: material } = await supabaseAdmin
    .from("materials")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: movements } = await supabaseAdmin
    .from("stock_movements")
    .select("*, actor:users(id, name)")
    .eq("materialId", params.id)
    .order("createdAt", { ascending: false })
    .limit(100);

  return NextResponse.json(movements ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: material } = await supabaseAdmin
    .from("materials")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = stockMovementSchema.safeParse({ ...body, materialId: params.id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, quantity, referenceType, referenceId, notes } = parsed.data;

  // Calculate new stock
  let newStock = material.stockOnHand;
  switch (type) {
    case "RECEIVED":
    case "RETURNED":
      newStock += quantity;
      break;
    case "ISSUED":
    case "SCRAPPED":
      if (quantity > material.stockOnHand) {
        return NextResponse.json(
          { error: `Insufficient stock. Have ${material.stockOnHand} ${material.unit}, tried to ${type.toLowerCase()} ${quantity}` },
          { status: 400 }
        );
      }
      newStock -= quantity;
      break;
    case "ADJUSTED":
      newStock = quantity; // Absolute adjustment
      break;
  }

  // Create movement record
  const { data: movement } = await supabaseAdmin
    .from("stock_movements")
    .insert({
      id: randomUUID(),
      organizationId: user.organizationId,
      materialId: params.id,
      type,
      quantity,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      notes: notes ?? null,
      actorId: user.id,
    })
    .select()
    .maybeSingle();

  // Update material stock
  await supabaseAdmin
    .from("materials")
    .update({ stockOnHand: newStock, updatedAt: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json(movement, { status: 201 });
}
