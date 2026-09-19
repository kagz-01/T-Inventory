import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabaseAdmin
    .from("users")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!member || member.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: events } = await supabaseAdmin
    .from("activity_events")
    .select("*")
    .eq("actorId", params.id)
    .eq("organizationId", user.organizationId)
    .order("createdAt", { ascending: false })
    .limit(50);

  return NextResponse.json(events ?? []);
}
