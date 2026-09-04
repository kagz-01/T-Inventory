"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ListTodo } from "lucide-react";

export default function EmployeesPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employees");
    setEmployees(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(id: string, role: string) {
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
    ADMIN: "default",
    MANAGER: "secondary",
    EMPLOYEE: "outline",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {employees.length} members · Workload view
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => {
            const initials = (e.name || e.email || "U")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <Card key={e.id} className="hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={`text-sm font-medium ${!e.active ? "text-muted-foreground line-through" : ""}`}>
                          {e.name || e.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{e.email}</p>
                      </div>
                    </div>
                    {isAdmin ? (
                      <select
                        value={e.role}
                        onChange={(ev) => updateRole(e.id, ev.target.value)}
                        className="text-xs border rounded-md bg-background px-2 py-1"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                    ) : (
                      <Badge variant={roleVariants[e.role] || "secondary"}>
                        {e.role}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <ListTodo className="h-3 w-3" />
                      {e.tasksAssigned?.length || 0} open task
                      {e.tasksAssigned?.length === 1 ? "" : "s"}
                    </div>
                    {e.tasksAssigned?.length > 0 && (
                      <div className="space-y-1">
                        {e.tasksAssigned.slice(0, 3).map((t: any) => (
                          <p key={t.id} className="text-xs text-muted-foreground truncate">
                            · {t.title}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
