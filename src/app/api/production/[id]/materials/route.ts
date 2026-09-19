import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { productionMaterialSchema } from "@/lib/validation";
import { randomUUID } from "crypto";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabaseAdmin
    .from("production_jobs")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!job || job.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: materials } = await supabaseAdmin
    .from("production_materials")
    .select("*, material:materials(id, name, unit), issuedByUser:users(id, name)")
    .eq("productionJobId", params.id)
    .order("issuedAt", { ascending: false });

  return NextResponse.json(materials ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabaseAdmin
    .from("production_jobs")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!job || job.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = productionMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: material } = await supabaseAdmin
    .from("materials")
    .select("*")
    .eq("id", parsed.data.materialId)
    .maybeSingle();

  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  if (parsed.data.quantityUsed > material.stockOnHand) {
    return NextResponse.json(
      { error: `Insufficient stock. Have ${material.stockOnHand} ${material.unit}` },
      { status: 400 }
    );
  }

  const { data: prodMaterial } = await supabaseAdmin
    .from("production_materials")
    .insert({
      id: randomUUID(),
      productionJobId: params.id,
      materialId: parsed.data.materialId,
      quantityUsed: parsed.data.quantityUsed,
      issuedBy: user.id,
    })
    .select("*, material:materials(id, name, unit), issuedByUser:users(id, name)")
    .maybeSingle();

  await supabaseAdmin.from("stock_movements").insert({
    id: randomUUID(),
    organizationId: user.organizationId,
    materialId: parsed.data.materialId,
    type: "ISSUED",
    quantity: parsed.data.quantityUsed,
    referenceType: "PRODUCTION_JOB",
    referenceId: params.id,
    notes: "Issued to job",
    actorId: user.id,
  });

  await supabaseAdmin
    .from("materials")
    .update({
      stockOnHand: material.stockOnHand - parsed.data.quantityUsed,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", parsed.data.materialId);

  return NextResponse.json(prodMaterial, { status: 201 });
}
