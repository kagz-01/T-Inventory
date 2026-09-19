import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { quotationSchema } from "@/lib/validation";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const supplierId = searchParams.get("supplierId") || undefined;

  let q = supabaseAdmin
    .from("quotations")
    .select("*, supplier:vendors(id, name)")
    .eq("organizationId", user.organizationId)
    .order("createdAt", { ascending: false });

  if (status) q = q.eq("status", status);
  if (supplierId) q = q.eq("supplierId", supplierId);

  const { data: quotes } = await q;
  return NextResponse.json(quotes ?? []);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: quote } = await supabaseAdmin
    .from("quotations")
    .insert({
      id: randomUUID(),
      ...parsed.data,
      status: parsed.data.status ?? "PENDING",
      organizationId: user.organizationId,
      createdById: user.id,
    })
    .select("*, supplier:vendors(id, name)")
    .maybeSingle();

  return NextResponse.json(quote, { status: 201 });
}
