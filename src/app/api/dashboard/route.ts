import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { Role } from "@/types/dbEnums";

const STALL_HOURS = 48; // task with no activity for this long gets flagged

export async function GET() {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isEmployee = user.role === Role.EMPLOYEE;
  // Basic Supabase queries — relational includes and advanced filters can
  // be improved later using RPC/views or explicit joins.
  const materialsRes = await supabaseAdmin.from('materials').select('*').eq('organizationId', user.organizationId);
  const materials = materialsRes.data ?? [];

  let tasksQuery = supabaseAdmin.from('sourcing_tasks').select('*').eq('organizationId', user.organizationId).neq('status', 'DISTRIBUTED').neq('status', 'UNAVAILABLE');
  if (isEmployee) tasksQuery = tasksQuery.eq('assignedToId', user.id);
  const tasksRes = await tasksQuery;
  const openTasks = tasksRes.data ?? [];

  const eventsRes = await supabaseAdmin.from('task_events').select('*').order('createdAt', { ascending: false }).limit(20);
  const recentEvents = eventsRes.data ?? [];

  const pendingInviteCount = isEmployee ? 0 : (await supabaseAdmin.from('invites').select('id', { head: true, count: 'exact' }).eq('organizationId', user.organizationId).eq('status', 'PENDING')).count ?? 0;

  const lowStock = materials.filter((m) => m.stockOnHand <= m.reorderThreshold);

  const stallCutoff = new Date(Date.now() - STALL_HOURS * 60 * 60 * 1000);
  const stalledTasks = openTasks.filter((t) => t.lastActivityAt < stallCutoff);

  const byStatus = openTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    role: user.role,
    lowStock: isEmployee ? [] : lowStock,
    stalledTasks,
    openTaskCount: openTasks.length,
    tasksByStatus: byStatus,
    recentEvents: isEmployee ? [] : recentEvents,
    myOpenTasks: isEmployee ? openTasks : undefined,
    pendingInviteCount,
  });
}
