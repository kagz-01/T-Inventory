"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, DollarSign, Calendar, FileText } from "lucide-react";

type Quotation = {
  id: string;
  supplierName: string;
  materialDescription: string;
  quotedPrice: number;
  currency: string;
  quantity: number;
  validUntil: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Vendor = { id: string; name: string };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-secondary text-secondary-foreground",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-danger text-danger-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

function QuoteStatusBadge({ status }: { status: string }) {
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

const defaultForm = {
  supplierId: "",
  materialDescription: "",
  quotedPrice: "",
  currency: "KES",
  quantity: "",
  validUntil: "",
  notes: "",
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/suppliers/quotations?${params.toString()}`);
    setQuotations(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function openNew() {
    const res = await fetch("/api/vendors");
    setVendors(await res.json());
    setForm(defaultForm);
    setShowNew(true);
  }

  function resetForm() {
    setForm(defaultForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId || !form.materialDescription) return;
    setSaving(true);
    await fetch("/api/suppliers/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: form.supplierId,
        materialDescription: form.materialDescription,
        quotedPrice: Number(form.quotedPrice),
        currency: form.currency,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
      }),
    });
    setShowNew(false);
    resetForm();
    setSaving(false);
    load();
  }

  const filtered = search
    ? quotations.filter(
        (q) =>
          q.supplierName.toLowerCase().includes(search.toLowerCase()) ||
          q.materialDescription.toLowerCase().includes(search.toLowerCase())
      )
    : quotations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quotations.length} total quotations
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          New Quote
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quotations..."
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

      {/* Quotations Grid */}
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
          {filtered.map((q) => (
            <Card
              key={q.id}
              className="hover:shadow-md transition-all cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{q.supplierName}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {q.materialDescription}
                      </p>
                    </div>
                  </div>
                  <QuoteStatusBadge status={q.status} />
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Quoted Price
                    </span>
                    <span className="font-medium">
                      {q.currency} {q.quotedPrice.toLocaleString()}
                    </span>
                  </div>
                  {q.quantity && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{q.quantity}</span>
                    </div>
                  )}
                  {q.validUntil && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Valid Until
                      </span>
                      <span className="font-medium">
                        {new Date(q.validUntil).toLocaleDateString()}
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
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  {search || statusFilter
                    ? "No quotations match your filters"
                    : "No quotations yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search || statusFilter
                    ? "Try a different search or filter"
                    : "Request your first quotation to get started"}
                </p>
                {!search && !statusFilter && (
                  <Button size="sm" className="mt-4" onClick={openNew}>
                    <Plus className="h-4 w-4" />
                    New Quote
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
              <CardTitle className="text-base">New Quotation</CardTitle>
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
                  required
                  placeholder="Material description"
                  value={form.materialDescription}
                  onChange={(e) =>
                    setForm({ ...form, materialDescription: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    required
                    min="0"
                    placeholder="Quoted price"
                    value={form.quotedPrice}
                    onChange={(e) =>
                      setForm({ ...form, quotedPrice: e.target.value })
                    }
                  />
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <Input
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                />
                <Input
                  type="date"
                  placeholder="Valid until"
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm({ ...form, validUntil: e.target.value })
                  }
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
                    {saving ? "Creating..." : "Create Quote"}
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
