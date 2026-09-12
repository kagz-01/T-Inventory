"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FolderOpen, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type Project = {
  id: string;
  name: string;
  clientName: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  COMPLETED: { label: "Completed", variant: "default" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ name: "", clientName: "", description: "" });
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/projects");
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        clientName: form.clientName || undefined,
        description: form.description || undefined,
      }),
    });
    setShowNew(false);
    setForm({ name: "", clientName: "", description: "" });
    setCreating(false);
    load();
  }

  const filtered = filter
    ? projects.filter((p) => p.status === filter)
    : projects;

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} projects — {activeCount} active, {completedCount} completed
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "", label: "All" },
          { value: "ACTIVE", label: "Active" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "COMPLETED", label: "Completed" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const progress = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
            const statusCfg = STATUS_CONFIG[p.status] || { label: p.status, variant: "secondary" as const };
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.clientName && (
                            <p className="text-xs text-muted-foreground">{p.clientName}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusCfg.variant} className="text-[10px]">
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {p.description && (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    )}

                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <ListTodo className="h-3.5 w-3.5" />
                          Tasks
                        </span>
                        <span className="font-medium">
                          {p.completedTasks}/{p.totalTasks}
                        </span>
                      </div>
                      {p.totalTasks > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{progress}% complete</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first project to organize tasks by client or tender
                </p>
                <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-scale-in">
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4">New Project</h2>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input
                  required
                  placeholder="Project name (e.g. County Government Tender)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  placeholder="Client name (optional)"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                />
                <Input
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Import for the task icon in the progress section
function ListTodo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M3 15h6" />
      <path d="M3 18h6" />
    </svg>
  );
}
