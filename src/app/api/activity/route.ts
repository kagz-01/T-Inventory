import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const entityType = searchParams.get("entityType") || undefined;

  let q = supabaseAdmin
    .from("activity_events")
    .select("*, actor:users(id, name, image)")
    .eq("organizationId", user.organizationId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (entityType) q = q.eq("entityType", entityType);

  const { data: events } = await q;
  return NextResponse.json(events ?? []);
}
