"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Package, Truck, Calendar, DollarSign } from "lucide-react";

type PurchaseOrder = {
  id: string;
  supplierName: string;
  status: string;
  totalEstimate: number | null;
  expectedDate: string | null;
  itemCount: number;
  notes: string | null;
  createdAt: string;
};

type Vendor = { id: string; name: string };
type Material = { id: string; name: string; unit: string };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PARTIAL", label: "Partial" },
  { value: "RECEIVED", label: "Received" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SUBMITTED: "border text-foreground",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-danger text-danger-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PARTIAL: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

function POStatusBadge({ status }: { status: string }) {
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

type LineItem = {
  materialId: string;
  quantity: number;
  unitCost: string;
};

const defaultForm = {
  supplierId: "",
  expectedDate: "",
  notes: "",
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/suppliers/purchase-orders?${params.toString()}`);
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

  async function loadFormData() {
    const [vRes, mRes] = await Promise.all([
      fetch("/api/vendors"),
      fetch("/api/materials"),
    ]);
    setVendors(await vRes.json());
    setMaterials(await mRes.json());
  }

  function openNew() {
    loadFormData();
    setForm(defaultForm);
    setLineItems([{ materialId: "", quantity: 1, unitCost: "" }]);
    setShowNew(true);
  }

  function resetForm() {
    setForm(defaultForm);
    setLineItems([]);
  }

  function addLineItem() {
    setLineItems([...lineItems, { materialId: "", quantity: 1, unitCost: "" }]);
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId || lineItems.length === 0) return;
    setSaving(true);
    await fetch("/api/suppliers/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: form.supplierId,
        expectedDate: form.expectedDate || undefined,
        notes: form.notes || undefined,
        lineItems: lineItems.map((li) => ({
          materialId: li.materialId,
          quantity: Number(li.quantity),
          unitCost: li.unitCost ? Number(li.unitCost) : undefined,
        })),
      }),
    });
    setShowNew(false);
    resetForm();
    setSaving(false);
    load();
  }

  const filtered = search
    ? orders.filter((o) =>
        o.supplierName.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orders.length} total purchase orders
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          New PO
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search purchase orders..."
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
          {filtered.map((po) => (
            <Card
              key={po.id}
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/suppliers/purchase-orders/${po.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{po.supplierName}</p>
                      <p className="text-xs text-muted-foreground">
                        {po.itemCount} item{po.itemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <POStatusBadge status={po.status} />
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  {po.totalEstimate != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Estimate
                      </span>
                      <span className="font-medium">
                        KES {po.totalEstimate.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {po.expectedDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Expected
                      </span>
                      <span className="font-medium">
                        {new Date(po.expectedDate).toLocaleDateString()}
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
                    ? "No purchase orders match your filters"
                    : "No purchase orders yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search || statusFilter
                    ? "Try a different search or filter"
                    : "Create your first purchase order to get started"}
                </p>
                {!search && !statusFilter && (
                  <Button size="sm" className="mt-4" onClick={openNew}>
                    <Plus className="h-4 w-4" />
                    New PO
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
          <Card className="w-full max-w-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="text-base">New Purchase Order</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <select
                  required
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select supplier...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  placeholder="Expected date"
                  value={form.expectedDate}
                  onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                />
                <Input
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />

                {/* Line Items */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Line Items</p>
                    <Button type="button" variant="ghost" size="sm" onClick={addLineItem}>
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                  {lineItems.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No items added yet</p>
                  )}
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <select
                        required
                        value={item.materialId}
                        onChange={(e) => updateLineItem(idx, "materialId", e.target.value)}
                        className="flex h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Material...</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity || ""}
                        onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                        className="h-9 w-20"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Unit cost"
                        value={item.unitCost}
                        onChange={(e) => updateLineItem(idx, "unitCost", e.target.value)}
                        className="h-9 w-28"
                      />
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500 hover:text-red-600 shrink-0"
                          onClick={() => removeLineItem(idx)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

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
                    {saving ? "Creating..." : "Create PO"}
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
