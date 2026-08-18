import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { materialSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: material } = await supabaseAdmin.from('materials').select('*').eq('id', params.id).maybeSingle();
  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data: photos } = await supabaseAdmin.from('material_photos').select('*').eq('materialId', material.id).order('createdAt', { ascending: false });
  const { data: links } = await supabaseAdmin.from('vendor_materials').select('*').eq('materialId', material.id).order('price', { ascending: true });
  for (const l of links ?? []) {
    const { data: v } = await supabaseAdmin.from('vendors').select('id,name').eq('id', l.vendorId).maybeSingle();
    (l as any).vendor = v ?? null;
  }
  return NextResponse.json({ ...material, photos: photos ?? [], vendorLinks: links ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin.from('materials').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = materialSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: material } = await supabaseAdmin.from('materials').update(parsed.data).eq('id', params.id).select().maybeSingle();
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin.from('materials').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await supabaseAdmin.from('materials').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}
