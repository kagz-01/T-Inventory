"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Truck, MapPin, Phone, Mail, Edit2, Trash2, Search } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  SOURCING: "Sourcing",
  BRANDING: "Branding",
  BOTH: "Both",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  SOURCING: "default",
  BRANDING: "secondary",
  BOTH: "outline",
};

type Vendor = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  materialLinks: any[];
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [showDelete, setShowDelete] = useState<Vendor | null>(null);
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "SOURCING",
    address: "",
    contactName: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/vendors");
    setVendors(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name,
      type: v.type,
      address: v.address || "",
      contactName: v.contactName || "",
      phone: v.phone || "",
      email: v.email || "",
      notes: "",
    });
  }

  function resetForm() {
    setForm({ name: "", type: "SOURCING", address: "", contactName: "", phone: "", email: "", notes: "" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowNew(false);
    resetForm();
    setSaving(false);
    load();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/vendors/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(null);
    resetForm();
    setSaving(false);
    load();
  }

  async function handleDelete() {
    if (!showDelete) return;
    await fetch(`/api/vendors/${showDelete.id}`, { method: "DELETE" });
    setShowDelete(null);
    load();
  }

  const filtered = vendors.filter((v) => {
    const matchesType = !filterType || v.type === filterType;
    const matchesSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      v.address?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {vendors.length} suppliers and branding partners
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="h-4 w-4" />
          New Vendor
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "", label: "All" },
          { value: "SOURCING", label: "Sourcing" },
          { value: "BRANDING", label: "Branding" },
          { value: "BOTH", label: "Both" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.label}
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
          {filtered.map((v) => (
            <Card key={v.id} className="hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <Badge variant={TYPE_VARIANTS[v.type] || "secondary"} className="text-[10px] mt-1">
                        {TYPE_LABELS[v.type] || v.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setShowDelete(v)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  {v.contactName && <p className="text-muted-foreground">{v.contactName}</p>}
                  {v.address && (
                    <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <MapPin className="h-3 w-3" />
                      {v.address}
                    </p>
                  )}
                  {v.phone && (
                    <a href={`tel:${v.phone}`} className="flex items-center gap-1.5 text-primary text-xs hover:underline">
                      <Phone className="h-3 w-3" />
                      {v.phone}
                    </a>
                  )}
                  {v.email && (
                    <a href={`mailto:${v.email}`} className="flex items-center gap-1.5 text-primary text-xs hover:underline">
                      <Mail className="h-3 w-3" />
                      {v.email}
                    </a>
                  )}
                </div>

                {v.materialLinks?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    Supplies {v.materialLinks.length} material{v.materialLinks.length > 1 ? "s" : ""}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Truck className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{search || filterType ? "No vendors match your filters" : "No vendors yet"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search || filterType ? "Try different search or filter" : "Add your first vendor to get started"}
                </p>
                {!search && !filterType && (
                  <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}>
                    <Plus className="h-4 w-4" />
                    Add Vendor
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
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4">New Vendor</h2>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input required placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                  <option value="SOURCING">Sourcing (raw/blank products)</option>
                  <option value="BRANDING">Branding (prints/embroidery)</option>
                  <option value="BOTH">Both</option>
                </select>
                <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Contact person" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowNew(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-scale-in">
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4">Edit Vendor</h2>
              <form onSubmit={handleUpdate} className="space-y-3">
                <Input required placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                  <option value="SOURCING">Sourcing (raw/blank products)</option>
                  <option value="BRANDING">Branding (prints/embroidery)</option>
                  <option value="BOTH">Both</option>
                </select>
                <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Contact person" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setEditing(null); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-base font-semibold mb-2">Delete Vendor</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete <strong>{showDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
