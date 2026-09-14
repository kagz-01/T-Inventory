import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import GetStartedGuide from "@/components/GetStartedGuide";
import DashboardCharts from "@/components/DashboardCharts";
import Reveal from "@/components/Reveal";
import AnimatedCounter from "@/components/AnimatedCounter";
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
  Zap,
  TrendingUp,
} from "lucide-react";

const STALL_HOURS = 48;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (!user.organizationId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card-glass rounded-2xl p-8 max-w-md text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mx-auto mb-4">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold font-display mb-2">Almost there</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn&apos;t attached to an organization yet. If you were
            invited, try signing out and back in. Otherwise, contact your admin.
          </p>
        </div>
      </div>
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
  else tasksQ = tasksQ.order("lastActivityAt", { ascending: true });

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
        {/* Hero Header */}
        <Reveal>
          <div className="hero-gradient rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22g%22%20width%3D%2220%22%20height%3D%2220%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.1)%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E')] opacity-30" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display">
                  {greeting}, {user.name?.split(" ")[0] || "there"}
                </h1>
                <p className="text-white/80 text-sm mt-0.5">
                  Let&apos;s get things done
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Progress Card */}
        <Reveal delay={80}>
          <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold font-display">Today&apos;s Progress</span>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {completedTasks.length} of {openTasksList.length} completed
                </span>
                <span className="text-sm font-bold font-mono text-primary">
                  {openTasksList.length === 0 ? 0 : Math.round((completedTasks.length / openTasksList.length) * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${openTasksList.length === 0 ? 0 : Math.round((completedTasks.length / openTasksList.length) * 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Pending", count: pendingTasks.length },
                { label: "In Progress", count: inProgressTasks.length },
                { label: "Completed", count: completedTasks.length },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-xl bg-muted/30">
                  <p className="text-xl font-bold font-mono">{item.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* My Tasks */}
        <Reveal delay={160}>
          <div>
            <h2 className="text-lg font-bold font-display mb-3">My Tasks</h2>
            {openTasksList.length === 0 ? (
              <div className="card-glass rounded-2xl p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold font-display">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nothing assigned to you right now. Check back later.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {openTasksList.map((t, i) => (
                  <Reveal key={t.id} delay={i * 60}>
                    <Link href={`/tasks/${t.id}`}>
                      <div className="card-glass rounded-xl p-4 flex items-center justify-between cursor-pointer group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t.material.name} · needs {t.quantityNeeded} {t.material.unit}
                          </p>
                          {stalledTasks.some((s) => s.id === t.id) && (
                            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              No activity {formatDistanceToNow(t.lastActivityAt, { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <StatusBadge status={t.status} />
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // MANAGER DASHBOARD — Blue, Department, Team
  // ══════════════════════════════════════════════
  if (isManager) {
    const urgentTasks = openTasksList.filter((t) => t.priority === "HIGH");
    const teamTasks = openTasksList;

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
        {/* Hero Header */}
        <Reveal>
          <div className="hero-gradient rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22g%22%20width%3D%2220%22%20height%3D%2220%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.1)%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E')] opacity-30" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display">
                  {greeting}, {user.name?.split(" ")[0] || "Manager"}
                </h1>
                <p className="text-white/80 text-sm mt-0.5">
                  Here&apos;s your team&apos;s overview
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: ListTodo, label: "Team Tasks", value: teamTasks.length, variant: urgentTasks.length > 0 ? "danger" : "default" as const, trend: urgentTasks.length > 0 ? `${urgentTasks.length} urgent` : undefined },
            { icon: Clock, label: "Pending Review", value: teamTasks.filter((t) => t.status === "PENDING").length, variant: "warning" as const },
            { icon: AlertTriangle, label: "Overdue", value: stalledTasks.length, variant: stalledTasks.length > 0 ? "danger" : "success" as const, trend: stalledTasks.length === 0 ? "On track" : undefined },
          ].map((kpi, i) => (
            <Reveal key={kpi.label} delay={i * 80}>
              <div className="kpi-card group">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    kpi.variant === "danger" ? "bg-red-500/10 text-red-500" :
                    kpi.variant === "warning" ? "bg-amber-500/10 text-amber-500" :
                    kpi.variant === "success" ? "bg-emerald-500/10 text-emerald-500" :
                    "bg-primary/10 text-primary"
                  }`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  {kpi.trend && (
                    <span className="text-xs font-medium text-muted-foreground font-mono">
                      {kpi.trend}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight font-mono">
                    <AnimatedCounter value={kpi.value} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Task Pipeline */}
        <Reveal delay={240}>
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4">Task Pipeline</h2>
            {openTasksList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No open tasks for your team.</p>
                <Link href="/tasks">
                  <button className="btn-primary mt-3">
                    <Plus className="h-4 w-4" /> Create Task
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <Link
                    key={status}
                    href={`/tasks?status=${status}`}
                    className="rounded-xl border border-border/50 p-3 text-center transition-all duration-300 hover:shadow-sm hover:border-primary/20 hover:bg-primary/5"
                  >
                    <p className="text-xl font-bold font-mono">{count as number}</p>
                    <div className="mt-1">
                      <StatusBadge status={status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Team Progress */}
        <Reveal delay={320}>
          <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold font-display">Team Progress</h2>
              <Link href="/employees" className="text-xs text-primary hover:underline font-medium">
                View all
              </Link>
            </div>
            {memberTaskCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No team tasks yet</p>
            ) : (
              <div className="space-y-4">
                {memberTaskCounts.map((m: { id: string; name: string; total: number; completed: number }) => (
                  <div key={m.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {m.completed}/{m.total}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${m.total === 0 ? 0 : Math.round((m.completed / m.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Low Stock */}
        <Reveal delay={400}>
          <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold font-display">Low Stock</h2>
              <Link href="/materials" className="text-xs text-primary hover:underline font-medium">
                View all
              </Link>
            </div>
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
                    className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                      {m.stockOnHand}/{m.reorderThreshold} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Recent Activity */}
        <Reveal delay={480}>
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4">Recent Activity</h2>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentEvents.slice(0, 5).map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3 text-sm">
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
          </div>
        </Reveal>
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
      {/* Hero Header */}
      <Reveal>
        <div className="hero-gradient rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22g%22%20width%3D%2220%22%20height%3D%2220%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.1)%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23g)%22/%3E%3C/svg%3E')] opacity-30" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display">
                  {greeting}, Boss
                </h1>
                <p className="text-white/80 text-sm mt-0.5">
                  Overview of your operations
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/tasks">
                <button className="inline-flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:bg-white/30 transition-all duration-300">
                  <Plus className="h-4 w-4" /> New Task
                </button>
              </Link>
              <Link href="/settings">
                <button className="inline-flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:bg-white/30 transition-all duration-300">
                  <Settings className="h-4 w-4" /> Settings
                </button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Onboarding guide */}
      {membersList.length + pendingInviteCount < 2 && (
        <Reveal delay={80}>
          <GetStartedGuide
            memberCount={membersList.length}
            pendingInviteCount={pendingInviteCount}
          />
        </Reveal>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Active Team", value: activeMembers, variant: "default" as const, trend: pendingInviteCount > 0 ? `${pendingInviteCount} pending` : undefined },
          { icon: ListTodo, label: "Open Tasks", value: openTasksList.length, variant: urgentTasks.length > 0 ? "danger" : "default" as const, trend: urgentTasks.length > 0 ? `${urgentTasks.length} urgent` : undefined },
          { icon: Package, label: "Low Stock", value: lowStock.length, variant: lowStock.length > 0 ? "warning" : "success" as const, trend: lowStock.length === 0 ? "All good" : undefined },
          { icon: Clock, label: "Stalled Tasks", value: stalledTasks.length, variant: stalledTasks.length > 0 ? "warning" : "success" as const, trend: stalledTasks.length === 0 ? "Moving smoothly" : undefined },
        ].map((kpi, i) => (
          <Reveal key={kpi.label} delay={i * 80}>
            <div className="kpi-card group">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  kpi.variant === "danger" ? "bg-red-500/10 text-red-500" :
                  kpi.variant === "warning" ? "bg-amber-500/10 text-amber-500" :
                  kpi.variant === "success" ? "bg-emerald-500/10 text-emerald-500" :
                  "bg-primary/10 text-primary"
                }`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                {kpi.trend && (
                  <span className="text-xs font-medium text-muted-foreground font-mono">
                    {kpi.trend}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tracking-tight font-mono">
                  <AnimatedCounter value={kpi.value} />
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Website Leads Alert */}
      {newLeadsCount > 0 && (
        <Reveal delay={320}>
          <Link href="/leads">
            <div className="card-glass rounded-2xl p-4 flex items-center justify-between cursor-pointer border-amber-200 dark:border-amber-800 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Inbox className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {newLeadsCount} new lead{newLeadsCount === 1 ? "" : "s"} from website
                  </p>
                  <p className="text-xs text-muted-foreground">Quote/site-visit requests to review</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </Reveal>
      )}

      {/* Task Pipeline */}
      <Reveal delay={400}>
        <div className="card-glass rounded-2xl p-6">
          <h2 className="text-base font-bold font-display mb-4">Task Pipeline</h2>
          {openTasksList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No open tasks yet.</p>
              <Link href="/tasks">
                <button className="btn-primary mt-3">
                  <Plus className="h-4 w-4" /> Create Task
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Link
                  key={status}
                  href={`/tasks?status=${status}`}
                  className="rounded-xl border border-border/50 p-3 text-center transition-all duration-300 hover:shadow-sm hover:border-primary/20 hover:bg-primary/5"
                >
                  <p className="text-xl font-bold font-mono">{count as number}</p>
                  <div className="mt-1">
                    <StatusBadge status={status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* Charts */}
      <Reveal delay={480}>
        <DashboardCharts
          tasksByStatus={statusCounts}
          materialsByCategory={materialsByCategory}
        />
      </Reveal>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Low Stock */}
        <Reveal delay={560}>
          <div className="card-glass rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold font-display">Low Stock</h2>
              <Link href="/materials" className="text-xs text-primary hover:underline font-medium">
                View all
              </Link>
            </div>
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
                    className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                      {m.stockOnHand}/{m.reorderThreshold} {m.unit}
                    </span>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">+{lowStock.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Stalled Tasks */}
        <Reveal delay={640}>
          <div className="card-glass rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold font-display">Stalled Tasks</h2>
              <span className="text-xs text-muted-foreground font-mono">48h+ inactive</span>
            </div>
            {stalledTasks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No stalled tasks — great pace!
              </div>
            ) : (
              <div className="space-y-2">
                {stalledTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="py-2 border-b border-border/50 last:border-0">
                    <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {t.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.assignedTo?.name || "Unassigned"} · {formatDistanceToNow(t.lastActivityAt, { addSuffix: true })}
                    </p>
                  </div>
                ))}
                {stalledTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">+{stalledTasks.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Team Insights */}
        <Reveal delay={720}>
          <div className="card-glass rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold font-display">Team Insights</h2>
              <Link href="/settings" className="text-xs text-primary hover:underline font-medium">
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { label: "Active Members", value: activeMembers },
                { label: "Avg Task Age", value: `${averageTaskAge}h` },
                { label: "Materials", value: `${materialsList.length} items` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Activity Feed */}
      <Reveal delay={800}>
        <div className="card-glass rounded-2xl p-6">
          <h2 className="text-base font-bold font-display mb-4">Recent Activity</h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {e.actor.name?.[0] || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{e.actor.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {e.type.replace("_", " ").toLowerCase()} on{" "}
                      </span>
                      <Link href={`/tasks/${e.task.id}`} className="font-medium text-primary hover:underline">
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
        </div>
      </Reveal>
    </div>
  );
}
