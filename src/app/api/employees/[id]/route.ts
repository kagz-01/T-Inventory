import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser, isAdmin } from "@/lib/permissions";
import { employeeRoleUpdateSchema } from "@/lib/validation";
import { logOrgEvent } from "@/lib/orgAudit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employee } = await supabaseAdmin.from('users').select('*').eq('id', params.id).maybeSingle();
  if (!employee || employee.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Fetch assigned tasks separately (simple fields + material lookup)
  const { data: tasks } = await supabaseAdmin.from('sourcing_tasks').select('*').eq('assignedToId', params.id).order('updatedAt', { ascending: false });
  const taskList = tasks ?? [];
  // Attach simple material info for each task where possible
  for (const t of taskList) {
    if (t.materialId) {
      const { data: mat } = await supabaseAdmin.from('materials').select('id,name,unit,category').eq('id', t.materialId).maybeSingle();
      (t as any).material = mat ?? null;
    }
  }
  return NextResponse.json({ ...employee, tasksAssigned: taskList });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Only Admin can change roles or access" }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin.from('users').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.id === user.id) {
    return NextResponse.json({ error: "You can't change your own role or access here" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = employeeRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: employee } = await supabaseAdmin.from('users').update(parsed.data).eq('id', params.id).select().maybeSingle();

  if (parsed.data.role && parsed.data.role !== existing.role) {
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "ROLE_CHANGED",
      targetEmail: existing.email,
      fromValue: existing.role,
      toValue: parsed.data.role,
    });
  }

  // Deactivating a user should immediately kill their sessions, not just hide
  // them from lists — otherwise they keep working until their session expires.
  if (parsed.data.active === false && existing.active) {
    await supabaseAdmin.from('sessions').delete().eq('userId', existing.id);
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "MEMBER_DEACTIVATED",
      targetEmail: existing.email,
    });
  }
  if (parsed.data.active === true && !existing.active) {
    await logOrgEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      type: "MEMBER_REACTIVATED",
      targetEmail: existing.email,
    });
  }

  return NextResponse.json(employee);
}
