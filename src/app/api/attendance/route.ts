import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const userId = searchParams.get("userId") || undefined;

  let q = supabaseAdmin
    .from("attendance")
    .select("*, user:users(id, name, image)")
    .eq("organizationId", user.organizationId)
    .eq("date", date)
    .order("createdAt", { ascending: false });

  if (userId) q = q.eq("userId", userId);

  const { data: records } = await q;
  return NextResponse.json(records ?? []);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { userId, date, clockIn, clockOut, status, notes } = body;

  if (!userId || !date) {
    return NextResponse.json({ error: "userId and date required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("organizationId", user.organizationId)
    .eq("userId", userId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const update: any = { updatedAt: new Date().toISOString() };
    if (clockIn) update.clockIn = clockIn;
    if (clockOut) update.clockOut = clockOut;
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const { data: record } = await supabaseAdmin
      .from("attendance")
      .update(update)
      .eq("id", existing.id)
      .select("*, user:users(id, name, image)")
      .maybeSingle();

    return NextResponse.json(record);
  }

  const { data: record } = await supabaseAdmin
    .from("attendance")
    .insert({
      id: randomUUID(),
      organizationId: user.organizationId,
      userId,
      date,
      clockIn: clockIn || null,
      clockOut: clockOut || null,
      status: status || (clockIn ? "PRESENT" : "ABSENT"),
      notes: notes || null,
    })
    .select("*, user:users(id, name, image)")
    .maybeSingle();

  return NextResponse.json(record, { status: 201 });
}
