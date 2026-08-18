import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { vendorSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('*').eq('id', params.id).maybeSingle();
  if (!vendor || vendor.organizationId !== user.organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: links } = await supabaseAdmin.from('vendor_materials').select('*').eq('vendorId', params.id);
  for (const l of links ?? []) {
    const { data: m } = await supabaseAdmin.from('materials').select('id,name,unit').eq('id', l.materialId).maybeSingle();
    (l as any).material = m ?? null;
  }
  return NextResponse.json({ ...vendor, materialLinks: links ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin.from('vendors').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organizationId !== user.organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = vendorSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: vendor } = await supabaseAdmin.from('vendors').update(parsed.data).eq('id', params.id).select().maybeSingle();
  return NextResponse.json(vendor);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing2 } = await supabaseAdmin.from('vendors').select('*').eq('id', params.id).maybeSingle();
  if (!existing2 || existing2.organizationId !== user.organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await supabaseAdmin.from('vendors').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}
