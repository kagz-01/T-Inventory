import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import GetStartedGuide from "@/components/GetStartedGuide";
import DashboardCharts from "@/components/DashboardCharts";
import { formatDistanceToNow } from "date-fns";
import { Role } from "@/types/dbEnums";
import {
  Users,
  ListTodo,
  AlertTriangle,
  Clock,
  Package,
  ArrowRight,
  Plus,
  Settings,
  Inbox,
  CheckCircle2,
  Crown,
  Shield,
  Target,
  TrendingUp,
  Zap,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STALL_HOURS = 48;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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
              {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2014"} {trendLabel}
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

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{completed} of {total} completed</span>
        <span className="text-sm font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
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
  const isAdmin = user.role === Role.ADMIN;
  const organizationId = user.organizationId as string;

  // ── Data fetching ──
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
  else
    tasksQ = tasksQ.order("lastActivityAt", { ascending: true });

  const tasksP = tasksQ;

  const leadsP = isEmployee
    ? Promise.resolve({ count: 0 })
    : supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organizationId", organizationId)
        .eq("status", "new");

  const membersP = isEmployee
    ? Promise.resolve({ count: 0, data: [] })
    : supabaseAdmin
        .from("users")
        .select("id, name, active")
        .eq("organizationId", organizationId);

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
    leadsRes,
    membersRes,
    invitesRes,
  ] = await Promise.all([
    materialsP,
    tasksP,
    leadsP,
    membersP,
    invitesP,
  ]);

  const materialsList = materials ?? [];
  const openTasksList = openTasks ?? [];

  // Fetch events scoped to this org's tasks
  let recentEvents: any[] = [];
  if (!isEmployee && openTasksList.length > 0) {
    const { data: eventsData } = await supabaseAdmin
      .from("task_events")
      .select("*, actor:users(id,name), task:sourcing_tasks(id,title)")
      .in("taskId", openTasksList.map((t) => t.id))
      .order("createdAt", { ascending: false })
      .limit(10);
    recentEvents = eventsData ?? [];
  }

  const newLeadsCount = (leadsRes as any).count ?? 0;
  const membersList = (membersRes as any).data ?? [];
  const activeMembers = membersList.filter((m: any) => m.active).length;
  const pendingInviteCount = (invitesRes as any).count ?? 0;
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

  const materialsByCategory = materialsList.reduce<Record<string, number>>(
    (acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    },
    {}
  );

  const greeting = getGreeting();

  // ══════════════════════════════════════════════
  // EMPLOYEE DASHBOARD — Green, Personal, Focused
  // ══════════════════════════════════════════════
  if (isEmployee) {
    const completedTasks = openTasksList.filter(
      (t) => t.status === "SOURCED" || t.status === "DISTRIBUTED"
    );
    const inProgressTasks = openTasksList.filter(
      (t) => t.status === "IN_PROGRESS"
    );
    const pendingTasks = openTasksList.filter(
      (t) => t.status === "PENDING" || t.status === "APPROVED"
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {greeting}, {user.name?.split(" ")[0] || "there"}
              </h1>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Let&apos;s get things done
              </p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Today&apos;s Progress</span>
            </div>
            <ProgressBar
              completed={completedTasks.length}
              total={openTasksList.length}
            />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{pendingTasks.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{inProgressTasks.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{completedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Tasks */}
        <div>
          <h2 className="text-base font-semibold mb-3">My Tasks</h2>
          {openTasksList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
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
                  <Card className="hover:shadow-md transition-all hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer">
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
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // MANAGER DASHBOARD — Blue, Department, Team
  // ══════════════════════════════════════════════
  if (isManager) {
    const urgentTasks = openTasksList.filter((t) => t.priority === "HIGH");
    const teamTasks = openTasksList;

    // Per-member task counts
    const memberTaskCounts = membersList
      .filter((m: any) => m.active)
      .map((m: any) => {
        const assigned = teamTasks.filter((t: any) => t.assignedToId === m.id);
        const completed = assigned.filter(
          (t: any) => t.status === "SOURCED" || t.status === "DISTRIBUTED"
        );
        return {
          id: m.id,
          name: m.name,
          total: assigned.length,
          completed: completed.length,
        };
      })
      .filter((m: { id: string; name: string; total: number; completed: number }) => m.total > 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {greeting}, {user.name?.split(" ")[0] || "Manager"}
              </h1>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Here&apos;s your team&apos;s overview
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            icon={ListTodo}
            label="Team Tasks"
            value={teamTasks.length}
            variant={urgentTasks.length > 0 ? "danger" : "default"}
            trendLabel={
              urgentTasks.length > 0
                ? `${urgentTasks.length} urgent`
                : undefined
            }
          />
          <KPICard
            icon={Clock}
            label="Pending Review"
            value={teamTasks.filter((t) => t.status === "PENDING").length}
            variant="warning"
          />
          <KPICard
            icon={AlertTriangle}
            label="Overdue"
            value={stalledTasks.length}
            variant={stalledTasks.length > 0 ? "danger" : "success"}
            trendLabel={
              stalledTasks.length === 0 ? "On track" : undefined
            }
          />
        </div>

        {/* Task Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {openTasksList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No open tasks for your team.
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
                    className="group rounded-lg border p-3 text-center transition-all hover:shadow-sm hover:border-blue-200 dark:hover:border-blue-800"
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

        {/* Team Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Team Progress</CardTitle>
            <Link
              href="/employees"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {memberTaskCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No team tasks yet
              </p>
            ) : (
              <div className="space-y-3">
                {memberTaskCounts.map((m: { id: string; name: string; total: number; completed: number }) => (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.completed}/{m.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{
                          width: `${m.total === 0 ? 0 : Math.round((m.completed / m.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
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
                {recentEvents.slice(0, 5).map((e: any) => (
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

  // ══════════════════════════════════════════════
  // ADMIN DASHBOARD — Gold, Executive, Full Control
  // ══════════════════════════════════════════════
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
      <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {greeting}, Boss
              </h1>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Overview of your operations
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/tasks">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Onboarding guide */}
      {membersList.length + pendingInviteCount < 2 && (
        <GetStartedGuide
          memberCount={membersList.length}
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
          icon={Package}
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
                  className="group rounded-lg border p-3 text-center transition-all hover:shadow-sm hover:border-amber-200 dark:hover:border-amber-800"
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

      {/* Charts */}
      <DashboardCharts
        tasksByStatus={statusCounts}
        materialsByCategory={materialsByCategory}
      />

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
            <Link
              href="/settings"
              className="text-xs text-primary hover:underline"
            >
              Manage
            </Link>
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
