import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/activity";

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

  if (existing?.clockIn) {
    return NextResponse.json({ error: "Already clocked in today" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (existing) {
    const { data: record } = await supabaseAdmin
      .from("attendance")
      .update({ clockIn: now, status: "PRESENT", updatedAt: now })
      .eq("id", existing.id)
      .select("*, user:users(id, name, image)")
      .maybeSingle();
    if (record) {
      logActivity({ organizationId: user.organizationId, actorId: user.id, eventType: "CLOCKED_IN", entityType: "attendance", entityId: record.id });
    }
    return NextResponse.json(record);
  }

  const { data: record } = await supabaseAdmin
    .from("attendance")
    .insert({
      id: randomUUID(),
      organizationId: user.organizationId,
      userId: params.id,
      date: today,
      clockIn: now,
      status: "PRESENT",
    })
    .select("*, user:users(id, name, image)")
    .maybeSingle();

  if (record) {
    logActivity({ organizationId: user.organizationId, actorId: user.id, eventType: "CLOCKED_IN", entityType: "attendance", entityId: record.id });
  }

  return NextResponse.json(record, { status: 201 });
}
