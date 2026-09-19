import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: supplier } = await supabaseAdmin
    .from("vendors")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!supplier || supplier.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get all POs for this supplier
  const { data: pos } = await supabaseAdmin
    .from("purchase_orders")
    .select("id, status, createdAt, expectedDate, updatedAt")
    .eq("supplierId", params.id)
    .eq("organizationId", user.organizationId);

  // Get all quotations
  const { data: quotes } = await supabaseAdmin
    .from("quotations")
    .select("id, status, createdAt")
    .eq("supplierId", params.id)
    .eq("organizationId", user.organizationId);

  // Get vendor materials (pricing)
  const { data: materials } = await supabaseAdmin
    .from("vendor_materials")
    .select("*, material:materials(id, name, unit)")
    .eq("vendorId", params.id);

  const totalPOs = pos?.length ?? 0;
  const receivedPOs = pos?.filter((p) => p.status === "RECEIVED").length ?? 0;
  const onTimePOs = pos?.filter((p) => {
    if (p.status !== "RECEIVED" || !p.expectedDate) return false;
    return new Date(p.updatedAt) <= new Date(p.expectedDate);
  }).length ?? 0;

  const totalQuotes = quotes?.length ?? 0;
  const acceptedQuotes = quotes?.filter((q) => q.status === "ACCEPTED").length ?? 0;

  return NextResponse.json({
    totalPOs,
    receivedPOs,
    onTimePOs,
    onTimeRate: receivedPOs > 0 ? Math.round((onTimePOs / receivedPOs) * 100) : 0,
    fillRate: totalPOs > 0 ? Math.round((receivedPOs / totalPOs) * 100) : 0,
    totalQuotes,
    acceptedQuotes,
    quoteAcceptanceRate: totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0,
    materials: materials ?? [],
  });
}
