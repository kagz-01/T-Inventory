"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Calendar, Clock, User, Package } from "lucide-react";

type ProductionJob = {
  id: string;
  title: string;
  status: string;
  assignedToId: string | null;
  customerOrderId: string | null;
  estimatedHours: number | null;
  dueDate: string | null;
  notes: string | null;
  assignedTo: { id: string; name: string } | null;
  customerOrder: { id: string; customerName: string; orderNumber: string } | null;
};

type Employee = { id: string; name: string };
type Order = { id: string; customerName: string; orderNumber: string };

const STATUS_TABS = ["All", "Queued", "In Progress", "On Hold", "Completed"] as const;
const STATUS_VALUES = ["", "QUEUED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"] as const;

const statusVariant = (s: string) => {
  switch (s) {
    case "QUEUED":
      return "secondary" as const;
    case "IN_PROGRESS":
      return "default" as const;
    case "ON_HOLD":
      return "warning" as const;
    case "COMPLETED":
      return "success" as const;
    case "CANCELLED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const statusLabel = (s: string) =>
  s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProductionPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({
    title: "",
    assignedToId: "",
    estimatedHours: "",
    dueDate: "",
    notes: "",
    customerOrderId: "",
  });

  async function load() {
    setLoading(true);
    const status = STATUS_VALUES[activeTab] || undefined;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/production?${params}`);
    setJobs(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [activeTab]);

  function resetForm() {
    setForm({
      title: "",
      assignedToId: "",
      estimatedHours: "",
      dueDate: "",
      notes: "",
      customerOrderId: "",
    });
  }

  async function openNew() {
    setShowNew(true);
    const [empRes, ordRes] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/orders"),
    ]);
    setEmployees(await empRes.json());
    setOrders(await ordRes.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        assignedToId: form.assignedToId || undefined,
        estimatedHours: form.estimatedHours
          ? Number(form.estimatedHours)
          : undefined,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
        customerOrderId: form.customerOrderId || undefined,
      }),
    });
    setShowNew(false);
    resetForm();
    setSaving(false);
    load();
  }

  const filtered = search
    ? jobs.filter((j) =>
        j.title.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs.length} jobs{" "}
            {STATUS_VALUES[activeTab]
              ? statusLabel(STATUS_VALUES[activeTab])
              : ""}
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          New Job
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {STATUS_TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === i
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
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
          {filtered.map((job) => (
            <Card
              key={job.id}
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/production/${job.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{job.title}</p>
                      {job.customerOrder && (
                        <p className="text-xs text-muted-foreground">
                          {job.customerOrder.customerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={statusVariant(job.status)}
                    className="text-[10px]"
                  >
                    {statusLabel(job.status)}
                  </Badge>
                </div>
                <div className="mt-4 pt-3 border-t border-border space-y-1">
                  {job.assignedTo && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5" /> Assigned
                      </span>
                      <span className="font-medium">
                        {job.assignedTo.name}
                      </span>
                    </div>
                  )}
                  {job.dueDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> Due
                      </span>
                      <span className="font-medium">
                        {new Date(job.dueDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {job.estimatedHours != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Est. Hours
                      </span>
                      <span className="font-medium">
                        {job.estimatedHours}h
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  {search ? "No jobs match your search" : "No jobs yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search
                    ? "Try a different search term"
                    : "Create your first production job to get started"}
                </p>
                {!search && (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={openNew}
                  >
                    <Plus className="h-4 w-4" />
                    New Job
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-scale-in">
            <CardHeader>
              <CardTitle className="text-base">
                New Production Job
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input
                  required
                  placeholder="Job title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />
                <select
                  className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.assignedToId}
                  onChange={(e) =>
                    setForm({ ...form, assignedToId: e.target.value })
                  }
                >
                  <option value="">Assign to (optional)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Estimated hours"
                  value={form.estimatedHours}
                  onChange={(e) =>
                    setForm({ ...form, estimatedHours: e.target.value })
                  }
                />
                <Input
                  type="date"
                  placeholder="Due date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
                <Input
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
                <select
                  className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.customerOrderId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customerOrderId: e.target.value,
                    })
                  }
                >
                  <option value="">Linked order (optional)</option>
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} - {ord.customerName}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowNew(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
