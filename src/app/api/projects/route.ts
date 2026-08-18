import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().optional(),
  description: z.string().optional(),
});

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: projects } = await supabaseAdmin.from('projects').select('*').eq('organizationId', user.organizationId).order('createdAt', { ascending: false });
  const list = projects ?? [];
  // Attach simple task counts per project
  for (const p of list) {
    const { data: tasks } = await supabaseAdmin.from('sourcing_tasks').select('id,status').eq('projectId', p.id);
    const tlist = tasks ?? [];
    (p as any).totalTasks = tlist.length;
    (p as any).completedTasks = tlist.filter((t: any) => t.status === 'DISTRIBUTED').length;
  }
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabaseAdmin.from('projects').insert({ ...parsed.data, organizationId: user.organizationId }).select().maybeSingle();
  return NextResponse.json(project, { status: 201 });
}
