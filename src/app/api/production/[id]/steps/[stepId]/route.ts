import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; stepId: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updateData: any = { ...body, updatedAt: new Date().toISOString() };

  if (body.status === "COMPLETED") {
    updateData.completedAt = new Date().toISOString();
  }

  const { data: step } = await supabaseAdmin
    .from("production_steps")
    .update(updateData)
    .eq("id", params.stepId)
    .eq("organizationId", user.organizationId)
    .select("*, assignedTo:users(id, name)")
    .maybeSingle();

  return NextResponse.json(step);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; stepId: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin
    .from("production_steps")
    .delete()
    .eq("id", params.stepId)
    .eq("organizationId", user.organizationId);

  return NextResponse.json({ success: true });
}
