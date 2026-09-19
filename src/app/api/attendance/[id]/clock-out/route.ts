import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("organizationId", user.organizationId)
    .eq("userId", params.id)
    .eq("date", today)
    .maybeSingle();

  if (!existing?.clockIn) {
    return NextResponse.json({ error: "Not clocked in today" }, { status: 400 });
  }

  if (existing.clockOut) {
    return NextResponse.json({ error: "Already clocked out today" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: record } = await supabaseAdmin
    .from("attendance")
    .update({ clockOut: now, updatedAt: now })
    .eq("id", existing.id)
    .select("*, user:users(id, name, image)")
    .maybeSingle();

  return NextResponse.json(record);
}
