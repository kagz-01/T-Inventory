import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { vendorSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const type = searchParams.get("type") || undefined; // SOURCING | BRANDING | BOTH

  let q: any = supabaseAdmin.from('vendors').select('*').eq('organizationId', user.organizationId);
  if (search) q = q.ilike('name', `%${search}%`);
  if (type) q = q.eq('type', type);
  q = q.order('name', { ascending: true });
  const { data: vendors } = await q;
  const result = vendors ?? [];
  for (const v of result) {
    const { data: links } = await supabaseAdmin.from('vendor_materials').select('*').eq('vendorId', v.id);
    for (const l of links ?? []) {
      const { data: m } = await supabaseAdmin.from('materials').select('id,name,unit').eq('id', l.materialId).maybeSingle();
      (l as any).material = m ?? null;
    }
    (v as any).materialLinks = links ?? [];
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: vendor } = await supabaseAdmin.from('vendors').insert({ ...parsed.data, organizationId: user.organizationId }).select().maybeSingle();
  return NextResponse.json(vendor, { status: 201 });
}
