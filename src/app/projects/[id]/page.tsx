"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, FolderOpen, Edit2, Trash2, ListTodo, DollarSign, CheckCircle2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  clientName: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  totalSpend: number;
  tasks: any[];
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  COMPLETED: { label: "Completed", variant: "default" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({ name: "", clientName: "", description: "" });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) { router.push("/projects"); return; }
    const data = await res.json();
    setProject(data);
    setForm({ name: data.name, clientName: data.clientName || "", description: data.description || "" });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        clientName: form.clientName || null,
        description: form.description || null,
      }),
    });
    setEditing(false);
    load();
  }

  async function handleStatusChange(status: string) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function handleDelete() {
    // Projects API doesn't have DELETE yet, but we can mark as completed
    await handleStatusChange("COMPLETED");
    setShowDelete(false);
    router.push("/projects");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  const statusCfg = STATUS_CONFIG[project.status] || { label: project.status, variant: "secondary" as const };
  const progress = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
            </div>
            {project.clientName && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.clientName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <ListTodo className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{project.totalTasks}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{project.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed ({progress}%)</p>
              </div>
            </div>
            {project.totalTasks > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">KES {project.totalSpend.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Spend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks ({project.tasks?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {project.tasks && project.tasks.length > 0 ? (
            <div className="space-y-2">
              {project.tasks.map((task: any) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} />
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.material?.name || "No material"} — Qty: {task.quantityNeeded}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {task.assignedTo && (
                      <p className="text-xs text-muted-foreground">{task.assignedTo.name}</p>
                    )}
                    {task.quotedPrice && (
                      <p className="text-xs font-medium">KES {task.quotedPrice.toLocaleString()}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No tasks in this project yet</p>
              <Link href="/tasks">
                <Button variant="outline" size="sm" className="mt-3">
                  <ListTodo className="h-4 w-4" />
                  View All Tasks
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4">Edit Project</h2>
              <form onSubmit={handleUpdate} className="space-y-3">
                <Input
                  required
                  placeholder="Project name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  placeholder="Client name"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                />
                <Input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
