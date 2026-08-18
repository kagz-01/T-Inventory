import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { vendorMaterialSchema } from "@/lib/validation";

// Creates or updates the price/quantity a vendor offers for a material.
// Upsert on (vendorId, materialId) since that pair is unique.
export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role) && user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = vendorMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Both sides of the link must belong to the caller's org, or a stray id could
  // be used to leak/mutate price data across organizations.
  const [vendorRes, materialRes] = await Promise.all([
    supabaseAdmin.from('vendors').select('*').eq('id', parsed.data.vendorId).maybeSingle(),
    supabaseAdmin.from('materials').select('*').eq('id', parsed.data.materialId).maybeSingle(),
  ]);
  const vendor = vendorRes.data;
  const material = materialRes.data;
  if (!vendor || vendor.organizationId !== user.organizationId) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  if (!material || material.organizationId !== user.organizationId) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  const { data: link } = await supabaseAdmin.from('vendor_materials').upsert({
    ...parsed.data,
    lastCheckedAt: new Date(),
  }, { onConflict: 'vendorId,materialId' }).select().maybeSingle();

  return NextResponse.json(link, { status: 201 });
}

// Price comparison: ?materialId=xxx returns all vendor prices for that material, cheapest first
export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");
  if (!materialId) {
    return NextResponse.json({ error: "materialId query param required" }, { status: 400 });
  }

  const { data: material } = await supabaseAdmin.from('materials').select('*').eq('id', materialId).maybeSingle();
  if (!material || material.organizationId !== user.organizationId) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  const { data: links } = await supabaseAdmin.from('vendor_materials').select('*').eq('materialId', materialId).order('price', { ascending: true });
  for (const l of links ?? []) {
    const { data: v } = await supabaseAdmin.from('vendors').select('id,name').eq('id', l.vendorId).maybeSingle();
    (l as any).vendor = v ?? null;
  }

  return NextResponse.json(links ?? []);
}
