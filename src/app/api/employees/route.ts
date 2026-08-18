import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

// Manual "pre-create by email" has been replaced by the invite system
// (see /api/invites) — members now only ever appear here once they've
// accepted an invite (or are the org's bootstrap admin) and signed in.
export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employees } = await supabaseAdmin.from('users').select('id,name,email,image,phone,role,active').eq('organizationId', user.organizationId).order('name', { ascending: true });
  const list = employees ?? [];
  // Attach open tasks per employee
  for (const e of list) {
    const { data: tasks } = await supabaseAdmin
      .from('sourcing_tasks')
      .select('id,title,status')
      .eq('assignedToId', e.id)
      .not('status', 'in', '(DISTRIBUTED,UNAVAILABLE)');
    (e as any).tasksAssigned = tasks ?? [];
  }

  return NextResponse.json(list);
}
