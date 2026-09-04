import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import GetStartedGuide from "@/components/GetStartedGuide";
import { formatDistanceToNow } from "date-fns";
import { Role } from "@/types/dbEnums";
import {
  Users,
  ListTodo,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  ArrowRight,
  Plus,
  Settings,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STALL_HOURS = 48;

function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  variant?: "default" | "danger" | "warning" | "success";
}) {
  const iconColors = {
    default: "bg-primary/10 text-primary",
    danger: "bg-red-500/10 text-red-500",
    warning: "bg-amber-500/10 text-amber-500",
    success: "bg-emerald-500/10 text-emerald-500",
  };

  const trendColors = {
    up: "text-emerald-500",
    down: "text-red-500",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColors[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && trendLabel && (
            <span className={`text-xs font-medium ${trendColors[trend]}`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"} {trendLabel}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (!user.organizationId) {
    return (
      <Card className="max-w-md">
        <CardContent className="p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold mb-1">Almost there</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn&apos;t attached to an organization yet. If you were
            invited, try signing out and back in. Otherwise, contact your admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isEmployee = user.role === Role.EMPLOYEE;
  const isManager = user.role === Role.MANAGER;
  const organizationId = user.organizationId as string;

  const materialsP = supabaseAdmin
    .from("materials")
    .select("*")
    .eq("organizationId", organizationId);
  let tasksQ = supabaseAdmin
    .from("sourcing_tasks")
    .select("*")
    .eq("organizationId", organizationId)
    .not("status", "in", "(DISTRIBUTED,UNAVAILABLE)");
  if (isEmployee)
    tasksQ = tasksQ
      .eq("assignedToId", user.id)
      .order("priority", { ascending: false })
      .order("lastActivityAt", { ascending: true });
  else tasksQ = tasksQ.order("lastActivityAt", { ascending: true });
  const tasksP = tasksQ;
  const eventsP = isEmployee
    ? Promise.resolve({ data: [] })
    : supabaseAdmin
        .from("task_events")
        .select("*, actor:users(id,name), task:sourcing_tasks(id,title)")
        .order("createdAt", { ascending: false })
        .limit(10);
  const leadsP = isEmployee
    ? Promise.resolve({ count: 0 })
    : supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organizationId", organizationId)
        .eq("status", "new");

  const membersP = isEmployee
    ? Promise.resolve({ count: 0 })
    : supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organizationId", organizationId)
        .eq("active", true);
  const invitesP = isEmployee
    ? Promise.resolve({ count: 0 })
    : supabaseAdmin
        .from("invites")
        .select("id", { count: "exact", head: true })
        .eq("organizationId", organizationId)
        .eq("status", "PENDING");

  const [
    { data: materials },
    { data: openTasks },
    eventsRes,
    leadsRes,
    membersRes,
    invitesRes,
  ] = await Promise.all([
    materialsP,
    tasksP,
    eventsP,
    leadsP,
    membersP,
    invitesP,
  ]);
  const recentEvents = (eventsRes as any).data ?? [];
  const newLeadsCount = (leadsRes as any).count ?? 0;
  const memberCount = (membersRes as any).count ?? 0;
  const pendingInviteCount = (invitesRes as any).count ?? 0;

  const materialsList = materials ?? [];
  const openTasksList = openTasks ?? [];
  const lowStock = materialsList.filter(
    (m) => m.stockOnHand <= m.reorderThreshold
  );
  const stallCutoff = new Date(Date.now() - STALL_HOURS * 60 * 60 * 1000);
  const stalledTasks = openTasksList.filter(
    (t) => t.lastActivityAt < stallCutoff
  );

  const statusCounts = openTasksList.reduce<Record<string, number>>(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // Employee dashboard
  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks assigned to you
          </p>
        </div>

        {openTasksList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nothing assigned to you right now. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {openTasksList.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.material.name} · needs {t.quantityNeeded}{" "}
                        {t.material.unit}
                      </p>
                      {stalledTasks.some((s) => s.id === t.id) && (
                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          No activity{" "}
                          {formatDistanceToNow(t.lastActivityAt, {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <StatusBadge status={t.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Admin/Manager dashboard
  const activeMembers = memberCount;
  const urgentTasks = openTasksList.filter((t) => t.priority === "HIGH");
  const averageTaskAge =
    openTasksList.length > 0
      ? Math.floor(
          openTasksList.reduce(
            (sum, t) =>
              sum + (Date.now() - new Date(t.lastActivityAt).getTime()),
            0
          ) /
            openTasksList.length /
            (1000 * 60 * 60)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your operations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </Link>
          {user.role === Role.ADMIN && (
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Onboarding guide */}
      {user.role === Role.ADMIN &&
        memberCount + pendingInviteCount < 2 && (
          <GetStartedGuide
            memberCount={memberCount}
            pendingInviteCount={pendingInviteCount}
          />
        )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Active Team"
          value={activeMembers}
          variant="default"
          trendLabel={
            pendingInviteCount > 0
              ? `${pendingInviteCount} pending`
              : undefined
          }
        />
        <KPICard
          icon={ListTodo}
          label="Open Tasks"
          value={openTasksList.length}
          variant={urgentTasks.length > 0 ? "danger" : "default"}
          trendLabel={
            urgentTasks.length > 0
              ? `${urgentTasks.length} urgent`
              : undefined
          }
        />
        <KPICard
          icon={AlertTriangle}
          label="Low Stock"
          value={lowStock.length}
          variant={lowStock.length > 0 ? "warning" : "success"}
          trendLabel={lowStock.length === 0 ? "All good" : undefined}
        />
        <KPICard
          icon={Clock}
          label="Stalled Tasks"
          value={stalledTasks.length}
          variant={stalledTasks.length > 0 ? "warning" : "success"}
          trendLabel={
            stalledTasks.length === 0 ? "Moving smoothly" : undefined
          }
        />
      </div>

      {/* Website Leads Alert */}
      {newLeadsCount > 0 && (
        <Link href="/leads">
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Inbox className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {newLeadsCount} new lead
                    {newLeadsCount === 1 ? "" : "s"} from website
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quote/site-visit requests to review
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Task Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {openTasksList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No open tasks yet.
              </p>
              <Link href="/tasks">
                <Button size="sm" className="mt-3">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Link
                  key={status}
                  href={`/tasks?status=${status}`}
                  className="group rounded-lg border p-3 text-center transition-all hover:shadow-sm hover:border-primary/20"
                >
                  <p className="text-xl font-bold">{count as number}</p>
                  <div className="mt-1">
                    <StatusBadge status={status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Grid: Alerts + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Low Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Low Stock</CardTitle>
            <Link
              href="/materials"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All materials well-stocked
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                  >
                    <span className="font-medium truncate">{m.name}</span>
                    <Badge variant="danger" className="shrink-0 ml-2">
                      {m.stockOnHand}/{m.reorderThreshold} {m.unit}
                    </Badge>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{lowStock.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stalled Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Stalled Tasks</CardTitle>
            <span className="text-xs text-muted-foreground">48h+ inactive</span>
          </CardHeader>
          <CardContent>
            {stalledTasks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No stalled tasks — great pace!
              </div>
            ) : (
              <div className="space-y-2">
                {stalledTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="py-1.5 border-b border-border last:border-0">
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.assignedTo?.name || "Unassigned"} ·{" "}
                      {formatDistanceToNow(t.lastActivityAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ))}
                {stalledTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{stalledTasks.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team & Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Team Insights</CardTitle>
            {user.role === Role.ADMIN && (
              <Link
                href="/settings"
                className="text-xs text-primary hover:underline"
              >
                Manage
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-sm text-muted-foreground">
                Active Members
              </span>
              <span className="text-sm font-semibold">{activeMembers}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-sm text-muted-foreground">
                Avg Task Age
              </span>
              <span className="text-sm font-semibold">{averageTaskAge}h</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">
                Materials
              </span>
              <span className="text-sm font-semibold">
                {materialsList.length} items
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No activity yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {e.actor.name?.[0] || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{e.actor.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {e.type.replace("_", " ").toLowerCase()} on{" "}
                      </span>
                      <Link
                        href={`/tasks/${e.task.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {e.task.title}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(e.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
