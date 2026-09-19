"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Calendar, DollarSign, Package } from "lucide-react";

type Order = {
  id: string;
  customerName: string;
  customerContact: string | null;
  description: string;
  orderType: "SIGNAGE" | "BRANDING" | "MIXED";
  status: string;
  quotedAmount: number | null;
  paidAmount: number | null;
  dueDate: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  createdAt: string;
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ENQUIRY", label: "Enquiry" },
  { value: "QUOTE_SENT", label: "Quote Sent" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "READY", label: "Ready" },
  { value: "COMPLETED", label: "Completed" },
];

const ORDER_TYPES = ["SIGNAGE", "BRANDING", "MIXED"] as const;

const STATUS_BADGE_STYLES: Record<string, string> = {
  ENQUIRY: "bg-secondary text-secondary-foreground",
  QUOTE_SENT: "border text-foreground",
  QUOTE_ACCEPTED: "bg-primary text-primary-foreground",
  IN_PRODUCTION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  QUALITY_CHECK: "bg-warning text-warning-foreground",
  READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DELIVERED: "bg-primary text-primary-foreground",
  INSTALLED: "bg-primary text-primary-foreground",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-danger text-danger-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  ENQUIRY: "Enquiry",
  QUOTE_SENT: "Quote Sent",
  QUOTE_ACCEPTED: "Quote Accepted",
  IN_PRODUCTION: "In Production",
  QUALITY_CHECK: "Quality Check",
  READY: "Ready",
  DELIVERED: "Delivered",
  INSTALLED: "Installed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ORDER_TYPE_BADGE_STYLES: Record<string, string> = {
  SIGNAGE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BRANDING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MIXED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function OrderStatusBadge({ status }: { status: string }) {
  const className = STATUS_BADGE_STYLES[status] || "bg-muted text-muted-foreground";
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function OrderTypeBadge({ type }: { type: string }) {
  const className = ORDER_TYPE_BADGE_STYLES[type] || "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {type}
    </span>
  );
}

const defaultForm = {
  customerName: "",
  customerContact: "",
  description: "",
  orderType: "SIGNAGE" as const,
  quotedAmount: "",
  dueDate: "",
  deliveryAddress: "",
  notes: "",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/orders?${params.toString()}`);
    setOrders(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  function resetForm() {
    setForm(defaultForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.customerName,
        customerContact: form.customerContact || undefined,
        description: form.description,
        orderType: form.orderType,
        quotedAmount: form.quotedAmount ? Number(form.quotedAmount) : undefined,
        dueDate: form.dueDate || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        notes: form.notes || undefined,
      }),
    });
    setShowNew(false);
    resetForm();
    setSaving(false);
    load();
  }

  const filtered = search
    ? orders.filter(
        (o) =>
          o.customerName.toLowerCase().includes(search.toLowerCase()) ||
          o.description.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orders.length} total orders
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <Card
              key={order.id}
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {order.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <OrderTypeBadge type={order.orderType} />
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  {order.quotedAmount != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Quoted
                      </span>
                      <span className="font-medium">
                        KES {order.quotedAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.dueDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due
                      </span>
                      <span className="font-medium">
                        {new Date(order.dueDate).toLocaleDateString()}
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
                  {search || statusFilter
                    ? "No orders match your filters"
                    : "No orders yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search || statusFilter
                    ? "Try a different search or filter"
                    : "Create your first order to get started"}
                </p>
                {!search && !statusFilter && (
                  <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}>
                    <Plus className="h-4 w-4" />
                    New Order
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-scale-in">
            <CardHeader>
              <CardTitle className="text-base">New Order</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input
                  required
                  placeholder="Customer name"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
                <Input
                  placeholder="Contact (phone or email)"
                  value={form.customerContact}
                  onChange={(e) => setForm({ ...form, customerContact: e.target.value })}
                />
                <Input
                  required
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <select
                  required
                  value={form.orderType}
                  onChange={(e) =>
                    setForm({ ...form, orderType: e.target.value as typeof form.orderType })
                  }
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ORDER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Quoted amount (KES)"
                  value={form.quotedAmount}
                  onChange={(e) => setForm({ ...form, quotedAmount: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Due date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
                <Input
                  placeholder="Delivery address"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                />
                <Input
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
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
                    {saving ? "Creating..." : "Create Order"}
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
