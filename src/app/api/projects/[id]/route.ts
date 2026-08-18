import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { z } from "zod";

const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabaseAdmin.from('projects').select('*').eq('id', params.id).maybeSingle();
  if (!project || project.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data: tasks } = await supabaseAdmin
    .from('sourcing_tasks')
    .select('*')
    .eq('projectId', params.id)
    .order('priority', { ascending: false })
    .order('lastActivityAt', { ascending: false });
  const tlist = tasks ?? [];
  for (const t of tlist) {
    if (t.materialId) {
      const { data: mat } = await supabaseAdmin.from('materials').select('id,name').eq('id', t.materialId).maybeSingle();
      (t as any).material = mat ?? null;
    }
    if (t.vendorId) {
      const { data: v } = await supabaseAdmin.from('vendors').select('id,name').eq('id', t.vendorId).maybeSingle();
      (t as any).vendor = v ?? null;
    }
    if (t.assignedToId) {
      const { data: a } = await supabaseAdmin.from('users').select('id,name,image').eq('id', t.assignedToId).maybeSingle();
      (t as any).assignedTo = a ?? null;
    }
  }

  const totalTasks = tlist.length;
  const completedTasks = tlist.filter((t: any) => t.status === 'DISTRIBUTED').length;
  const totalSpend = tlist.reduce((sum: number, t: any) => sum + (t.quotedPrice || 0), 0);

  return NextResponse.json({ ...project, tasks: tlist, totalTasks, completedTasks, totalSpend });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin.from('projects').select('*').eq('id', params.id).maybeSingle();
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabaseAdmin.from('projects').update(parsed.data).eq('id', params.id).select().maybeSingle();
  return NextResponse.json(project);
}
