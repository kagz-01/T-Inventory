"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsNav from "@/components/ReportsNav";
import {
  Users,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

type AttendanceRecord = {
  id: string;
  status: string;
  date: string;
  user: { id: string; name: string } | null;
};

type Task = {
  id: string;
  assignedToId: string | null;
  status: string;
  lastActivityAt: string;
};

type EmployeesData = {
  members: Member[];
  activeCount: number;
  attendance: AttendanceRecord[];
  tasks: Task[];
};

export default function EmployeesReportPage() {
  const [data, setData] = useState<EmployeesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?type=employees")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <ReportsNav />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-glass rounded-2xl p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="card-glass rounded-2xl p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { members, activeCount, attendance, tasks } = data;
  const inactiveCount = members.length - activeCount;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthAttendance = attendance.filter((a) => {
    const d = new Date(a.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const presentCount = monthAttendance.filter(
    (a) => a.status === "PRESENT"
  ).length;
  const absentCount = monthAttendance.filter(
    (a) => a.status === "ABSENT"
  ).length;
  const leaveCount = monthAttendance.filter(
    (a) => a.status === "LEAVE"
  ).length;

  const tasksByUser: Record<string, { assigned: number; completed: number }> =
    {};
  for (const m of members) {
    tasksByUser[m.id] = { assigned: 0, completed: 0 };
  }
  for (const t of tasks) {
    if (t.assignedToId && tasksByUser[t.assignedToId]) {
      tasksByUser[t.assignedToId].assigned++;
      if (t.status === "COMPLETED") {
        tasksByUser[t.assignedToId].completed++;
      }
    }
  }

  return (
    <div className="space-y-6">
      <ReportsNav />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Team overview, attendance, and performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Total Members
            </span>
          </div>
          <p className="text-2xl font-bold font-mono">{members.length}</p>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Active Members
            </span>
          </div>
          <p className="text-2xl font-bold font-mono">{activeCount}</p>
        </div>

        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <UserX className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Inactive Members
            </span>
          </div>
          <p className="text-2xl font-bold font-mono">{inactiveCount}</p>
        </div>
      </div>

      {/* Attendance Overview */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold font-display">
            Attendance Overview — {now.toLocaleString("default", { month: "long" })}{" "}
            {currentYear}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mx-auto mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-xl font-bold font-mono">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>

          <div className="text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 mx-auto mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-xl font-bold font-mono">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>

          <div className="text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 mx-auto mb-2">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xl font-bold font-mono">{leaveCount}</p>
            <p className="text-xs text-muted-foreground">Leave</p>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-sm font-semibold font-display">
            Team Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tasks Assigned
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tasks Completed
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const stats = tasksByUser[member.id];
                const rate =
                  stats.assigned > 0
                    ? Math.round((stats.completed / stats.assigned) * 100)
                    : 0;

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <span className="font-medium">{member.name}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {stats.assigned}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {stats.completed}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rate >= 80
                                ? "bg-emerald-500"
                                : rate >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No team members</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Employee data will appear here once members are added.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
