import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabaseAdmin
    .from("users")
    .select("id, organizationId")
    .eq("id", params.id)
    .maybeSingle();

  if (!member || member.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orgId = user.organizationId;

  // Tasks completed
  const { count: tasksCompleted } = await supabaseAdmin
    .from("sourcing_tasks")
    .select("id", { count: "exact", head: true })
    .eq("assignedToId", params.id)
    .eq("organizationId", orgId)
    .in("status", ["SOURCED", "DISTRIBUTED"]);

  // Tasks assigned
  const { count: tasksAssigned } = await supabaseAdmin
    .from("sourcing_tasks")
    .select("id", { count: "exact", head: true })
    .eq("assignedToId", params.id)
    .eq("organizationId", orgId);

  // Attendance this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: daysPresent } = await supabaseAdmin
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("userId", params.id)
    .eq("organizationId", orgId)
    .eq("status", "PRESENT")
    .gte("date", startOfMonth.toISOString().split("T")[0]);

  // Production jobs completed
  const { count: jobsCompleted } = await supabaseAdmin
    .from("production_jobs")
    .select("id", { count: "exact", head: true })
    .eq("assignedToId", params.id)
    .eq("organizationId", orgId)
    .eq("status", "COMPLETED");

  // Working days this month (Mon-Fri)
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  let workingDays = 0;
  for (let d = 1; d <= currentDay; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (day !== 0 && day !== 6) workingDays++;
  }

  return NextResponse.json({
    tasksCompleted: tasksCompleted ?? 0,
    tasksAssigned: tasksAssigned ?? 0,
    completionRate: tasksAssigned ? Math.round(((tasksCompleted ?? 0) / (tasksAssigned ?? 1)) * 100) : 0,
    daysPresent: daysPresent ?? 0,
    workingDays,
    attendanceRate: workingDays > 0 ? Math.round(((daysPresent ?? 0) / workingDays) * 100) : 0,
    jobsCompleted: jobsCompleted ?? 0,
  });
}
