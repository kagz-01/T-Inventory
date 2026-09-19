import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { materialSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const lowStock = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search") || undefined;

  let query = supabaseAdmin.from('materials').select('*').eq('organizationId', user.organizationId).order('name', { ascending: true });
  if (category) query = query.eq('category', category);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data: materials } = await query;
  const list = materials ?? [];
  for (const m of list) {
    const { data: photos } = await supabaseAdmin.from('material_photos').select('*').eq('materialId', m.id).order('createdAt', { ascending: false }).limit(3);
    (m as any).photos = photos ?? [];
    const { data: links } = await supabaseAdmin.from('vendor_materials').select('*').eq('materialId', m.id);
    for (const l of links ?? []) {
      const { data: v } = await supabaseAdmin.from('vendors').select('id,name').eq('id', l.vendorId).maybeSingle();
      (l as any).vendor = v ?? null;
    }
    (m as any).vendorLinks = links ?? [];
  }

  const filtered = lowStock
    ? list.filter((m) => m.stockOnHand <= m.reorderThreshold)
    : list;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = materialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: material } = await supabaseAdmin.from('materials').insert({ ...parsed.data, organizationId: user.organizationId }).select().maybeSingle();
  return NextResponse.json(material, { status: 201 });
}
