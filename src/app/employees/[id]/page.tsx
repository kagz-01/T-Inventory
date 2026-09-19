"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Shield,
  User,
  CheckCircle2,
  Clock,
  CalendarDays,
  TrendingUp,
  LogIn,
  LogOut,
  Activity,
  Briefcase,
  Loader2,
} from "lucide-react";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);

  async function load() {
    setLoading(true);
    const [empRes, perfRes, actRes] = await Promise.all([
      fetch(`/api/employees/${id}`),
      fetch(`/api/employees/${id}/performance`),
      fetch(`/api/employees/${id}/activity`),
    ]);
    setEmployee(await empRes.json());
    setPerformance(await perfRes.json());
    setActivity(await actRes.json());

    const today = new Date().toISOString().split("T")[0];
    const attRes = await fetch(`/api/attendance?userId=${id}&date=${today}`);
    const todayRecords = await attRes.json();
    setTodayAttendance(todayRecords?.[0] || null);

    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
    const monthRes = await fetch(`/api/attendance?userId=${id}&date=${monthStart}`);
    const monthRecords = await monthRes.json();
    setAttendance(monthRecords || []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleClockIn() {
    setClocking(true);
    await fetch(`/api/attendance/${id}/clock-in`, { method: "POST" });
    await load();
    setClocking(false);
  }

  async function handleClockOut() {
    setClocking(true);
    await fetch(`/api/attendance/${id}/clock-out`, { method: "POST" });
    await load();
    setClocking(false);
  }

  if (loading || !employee || !performance) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (employee.name || employee.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isClockedIn = todayAttendance?.clockIn && !todayAttendance?.clockOut;

  const monthDays = eachDayOfInterval({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  const attendanceDates = new Set(
    attendance.map((a: any) => a.date)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/employees"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight font-display">
                  {employee.name || employee.email}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    employee.active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {employee.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {employee.email}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  {employee.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clock In/Out Button */}
        <button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={clocking}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            isClockedIn
              ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25"
              : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"
          } disabled:opacity-50`}
        >
          {clocking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isClockedIn ? (
            <LogOut className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {isClockedIn ? "Clock Out" : "Clock In"}
        </button>
      </div>

      {/* Performance Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tasks Completed</p>
              <p className="text-xl font-bold">{performance.tasksCompleted}</p>
            </div>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-xl font-bold">{performance.completionRate}%</p>
            </div>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
              <p className="text-xl font-bold">{performance.attendanceRate}%</p>
            </div>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jobs Completed</p>
              <p className="text-xl font-bold">{performance.jobsCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — Attendance & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Attendance Calendar */}
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Attendance — {format(new Date(), "MMMM yyyy")}
            </h2>
            <div className="grid grid-cols-7 gap-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-xs font-medium text-muted-foreground text-center py-1">
                  {d}
                </div>
              ))}
              {monthDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isPresent = attendanceDates.has(dateStr);
                const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
                const weekend = isWeekend(day);
                return (
                  <div
                    key={dateStr}
                    className={`flex items-center justify-center h-9 rounded-lg text-xs font-medium transition-colors ${
                      weekend
                        ? "text-muted-foreground/40"
                        : isPresent
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : isToday
                        ? "ring-2 ring-primary/30 text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Present ({performance.daysPresent}/{performance.workingDays})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                Absent
              </span>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </h2>
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activity.slice(0, 15).map((ev: any, idx: number) => (
                  <div key={ev.id} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      {idx < Math.min(activity.length, 15) - 1 && (
                        <div className="w-0.5 flex-1 min-h-[1.5rem] bg-border" />
                      )}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {ev.type?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                      </p>
                      {ev.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(ev.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                <p className="text-sm font-medium">{employee.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <p className="text-sm font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Role</p>
                <p className="text-sm font-medium">{employee.role}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <p className={`text-sm font-medium ${employee.active ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {employee.active ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                <p className="text-sm font-medium">
                  {employee.createdAt
                    ? format(new Date(employee.createdAt), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Attendance */}
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Today&apos;s Attendance
            </h2>
            {todayAttendance ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {todayAttendance.status}
                  </span>
                </div>
                {todayAttendance.clockIn && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Clock In</p>
                    <p className="text-sm font-medium">
                      {format(new Date(todayAttendance.clockIn), "h:mm a")}
                    </p>
                  </div>
                )}
                {todayAttendance.clockOut && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Clock Out</p>
                    <p className="text-sm font-medium">
                      {format(new Date(todayAttendance.clockOut), "h:mm a")}
                    </p>
                  </div>
                )}
                {todayAttendance.clockIn && todayAttendance.clockOut && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Hours Worked</p>
                    <p className="text-sm font-semibold">
                      {(
                        (new Date(todayAttendance.clockOut).getTime() -
                          new Date(todayAttendance.clockIn).getTime()) /
                        (1000 * 60 * 60)
                      ).toFixed(1)}h
                    </p>
                  </div>
                )}
                {!todayAttendance.clockOut && todayAttendance.clockIn && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Currently clocked in
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No attendance record today</p>
              </div>
            )}
          </div>

          {/* Assigned Tasks */}
          {employee.tasksAssigned && employee.tasksAssigned.length > 0 && (
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Assigned Tasks ({employee.tasksAssigned.length})
              </h2>
              <div className="space-y-2">
                {employee.tasksAssigned.slice(0, 5).map((task: any) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.material && (
                        <p className="text-xs text-muted-foreground">
                          {task.material.name} · {task.material.unit}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        task.status === "DISTRIBUTED" || task.status === "SOURCED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {task.status?.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
