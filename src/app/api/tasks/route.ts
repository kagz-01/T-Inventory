import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { taskSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";
import { Role } from "@/types/dbEnums";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const assignedToId = searchParams.get("assignedToId") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const mine = searchParams.get("mine") === "true";

  let query = supabaseAdmin.from('sourcing_tasks').select('*').eq('organizationId', user.organizationId);
  if (status) query = query.eq('status', status);
  if (projectId) query = query.eq('projectId', projectId);
  if (mine || user.role === Role.EMPLOYEE) query = query.eq('assignedToId', user.id);
  else if (assignedToId) query = query.eq('assignedToId', assignedToId);
  const { data: tasks } = await query.order('priority', { ascending: false }).order('lastActivityAt', { ascending: false });
  const list = tasks ?? [];
  // Enrich tasks with related data
  for (const t of list) {
    if (t.materialId) {
      const { data: m } = await supabaseAdmin.from('materials').select('id,name,unit').eq('id', t.materialId).maybeSingle();
      (t as any).material = m ?? null;
    }
    if (t.vendorId) {
      const { data: v } = await supabaseAdmin.from('vendors').select('id,name').eq('id', t.vendorId).maybeSingle();
      (t as any).vendor = v ?? null;
    }
    if (t.assignedToId) {
      const { data: a } = await supabaseAdmin.from('users').select('id,name,image').eq('id', t.assignedToId).maybeSingle();
      (t as any).assignedTo = a ?? null;
    }
    if (t.createdById) {
      const { data: c } = await supabaseAdmin.from('users').select('id,name').eq('id', t.createdById).maybeSingle();
      (t as any).createdBy = c ?? null;
    }
    if (t.projectId) {
      const { data: p } = await supabaseAdmin.from('projects').select('id,name').eq('id', t.projectId).maybeSingle();
      (t as any).project = p ?? null;
    }
    const { data: photos } = await supabaseAdmin.from('task_photos').select('*').eq('taskId', t.id).order('createdAt', { ascending: false }).limit(1);
    (t as any).photos = photos ?? [];
    const { count: eventsCount } = await supabaseAdmin.from('task_events').select('id', { count: 'exact', head: true }).eq('taskId', t.id);
    const { count: commentsCount } = await supabaseAdmin.from('task_comments').select('id', { count: 'exact', head: true }).eq('taskId', t.id);
    (t as any)._count = { events: eventsCount ?? 0, comments: commentsCount ?? 0 };
  }

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // material, project, and assignee (if given) must all belong to the caller's org.
  const { data: material } = await supabaseAdmin.from('materials').select('*').eq('id', parsed.data.materialId).maybeSingle();
  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }
  if (parsed.data.projectId) {
    const { data: project } = await supabaseAdmin.from('projects').select('*').eq('id', parsed.data.projectId).maybeSingle();
    if (!project || project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }
  if (parsed.data.assignedToId) {
    const { data: assignee } = await supabaseAdmin.from('users').select('*').eq('id', parsed.data.assignedToId).maybeSingle();
    if (!assignee || assignee.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }
  }
  const { data: task } = await supabaseAdmin.from('sourcing_tasks').insert({
    ...parsed.data,
    organizationId: user.organizationId,
    status: parsed.data.assignedToId ? 'ASSIGNED' : 'PENDING',
    createdById: user.id,
  }).select().maybeSingle();

  await logTaskEvent({ taskId: task.id, actorId: user.id, type: 'CREATED', note: parsed.data.assignedToId ? 'Task created and assigned' : 'Task created' });
  if (parsed.data.assignedToId) await logTaskEvent({ taskId: task.id, actorId: user.id, type: 'ASSIGNED', toValue: parsed.data.assignedToId });

  return NextResponse.json(task, { status: 201 });
}
