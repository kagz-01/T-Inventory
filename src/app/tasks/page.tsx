"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import NewTaskModal from "@/components/NewTaskModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, ListTodo, Search, Filter } from "lucide-react";

const COLUMNS = [
  "PENDING",
  "ASSIGNED",
  "SEARCHING",
  "REASSIGNED",
  "FOUND",
  "SAMPLE_COLLECTED",
  "AWAITING_APPROVAL",
  "PURCHASED",
  "BRANDING_IN_PROGRESS",
  "BRANDING_COMPLETE",
  "DISTRIBUTED",
  "UNAVAILABLE",
];

const PRIORITY_FILTERS = [
  { value: "", label: "All" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.material?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sourcing pipeline — drag through stages
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                priorityFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[260px] shrink-0 space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const items = filteredTasks.filter((t) => t.status === status);
            return (
              <div key={status} className="min-w-[260px] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={status} />
                  <span className="text-xs text-muted-foreground font-medium">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <Link key={t.id} href={`/tasks/${t.id}`}>
                      <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer mb-2">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium truncate">
                            {t.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.material?.name} · {t.quantityNeeded}{" "}
                            {t.material?.unit}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                              {t.assignedTo?.name || "Unassigned"}
                            </span>
                            {t.priority !== "NORMAL" && (
                              <Badge
                                variant={
                                  t.priority === "HIGH" ? "danger" : t.priority === "URGENT" ? "danger" : "warning"
                                }
                                className="text-[10px]"
                              >
                                {t.priority}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground italic text-center py-4">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewTaskModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}
