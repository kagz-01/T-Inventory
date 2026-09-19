import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { randomUUID } from "crypto";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: steps } = await supabaseAdmin
    .from("production_steps")
    .select("*, assignedTo:users(id, name)")
    .eq("productionJobId", params.id)
    .eq("organizationId", user.organizationId)
    .order("sort_order", { ascending: true });

  return NextResponse.json(steps ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: step } = await supabaseAdmin
    .from("production_steps")
    .insert({
      id: randomUUID(),
      productionJobId: params.id,
      name: body.name,
      status: "PENDING",
      assignedToId: body.assignedToId ?? null,
      sort_order: body.sort_order ?? 0,
      organizationId: user.organizationId,
    })
    .select("*, assignedTo:users(id, name)")
    .maybeSingle();

  return NextResponse.json(step, { status: 201 });
}
