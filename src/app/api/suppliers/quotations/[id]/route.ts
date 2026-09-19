import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { quotationSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: quote } = await supabaseAdmin
    .from("quotations")
    .select("*, supplier:vendors(id, name, contactName, phone, email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!quote || quote.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(quote);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("quotations")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = quotationSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: quote } = await supabaseAdmin
    .from("quotations")
    .update({ ...parsed.data, updatedAt: new Date().toISOString() })
    .eq("id", params.id)
    .select("*, supplier:vendors(id, name)")
    .maybeSingle();

  return NextResponse.json(quote);
}
