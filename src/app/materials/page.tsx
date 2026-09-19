"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, AlertTriangle, Edit2, Trash2, Search } from "lucide-react";
import StockMovements from "@/components/StockMovements";

type Material = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stockOnHand: number;
  reorderThreshold: number;
  description: string | null;
  costPerUnit: number | null;
  supplierId: string | null;
  vendorLinks: any[];
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [showDelete, setShowDelete] = useState<Material | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Material | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    stockOnHand: 0,
    reorderThreshold: 0,
    description: "",
    costPerUnit: "",
    supplierId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/materials");
    setMaterials(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      name: m.name,
      category: m.category,
      unit: m.unit,
      stockOnHand: m.stockOnHand,
      reorderThreshold: m.reorderThreshold,
      description: m.description || "",
      costPerUnit: m.costPerUnit?.toString() || "",
      supplierId: m.supplierId || "",
    });
  }

  function resetForm() {
    setForm({ name: "", category: "", unit: "", stockOnHand: 0, reorderThreshold: 0, description: "", costPerUnit: "", supplierId: "" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        stockOnHand: Number(form.stockOnHand),
        reorderThreshold: Number(form.reorderThreshold),
      }),
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
    await fetch(`/api/materials/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        stockOnHand: Number(form.stockOnHand),
        reorderThreshold: Number(form.reorderThreshold),
      }),
    });
    setEditing(null);
    resetForm();
    setSaving(false);
    load();
  }

  async function handleDelete() {
    if (!showDelete) return;
    await fetch(`/api/materials/${showDelete.id}`, { method: "DELETE" });
    setShowDelete(null);
    load();
  }

  const filtered = search
    ? materials.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
      )
    : materials;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {materials.length} items in catalogue
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="h-4 w-4" />
          New Material
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
          {filtered.map((m) => {
            const low = m.stockOnHand <= m.reorderThreshold;
            return (
              <Card
                key={m.id}
                className={`hover:shadow-md transition-all cursor-pointer ${low ? "border-red-200 dark:border-red-800" : ""}`}
                onClick={() => setSelected(m)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${low ? "bg-red-500/10" : "bg-muted"}`}>
                        <Package className={`h-4 w-4 ${low ? "text-red-500" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {low && (
                        <Badge variant="danger" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(m)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setShowDelete(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stock</span>
                      <span className={`font-medium ${low ? "text-red-500" : ""}`}>
                        {m.stockOnHand} {m.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Reorder at</span>
                      <span className="text-muted-foreground">{m.reorderThreshold} {m.unit}</span>
                    </div>
                    {m.vendorLinks?.length > 0 && (
                      <div className="flex items-center justify-between text-sm mt-1 pt-2 border-t border-border">
                        <span className="text-muted-foreground">Cheapest</span>
                        <span className="text-xs font-medium">
                          {m.vendorLinks.sort((a: any, b: any) => a.price - b.price)[0]?.vendor?.name} — KES
                          {m.vendorLinks.sort((a: any, b: any) => a.price - b.price)[0]?.price}
                        </span>
                      </div>
                    )}
                    {m.costPerUnit != null && (
                      <div className="flex items-center justify-between text-sm mt-1 pt-2 border-t border-border">
                        <span className="text-muted-foreground">Cost</span>
                        <span className="text-xs font-medium">KES {m.costPerUnit}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{search ? "No materials match your search" : "No materials yet"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term" : "Add your first material to get started"}
                </p>
                {!search && (
                  <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}>
                    <Plus className="h-4 w-4" />
                    Add Material
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
              <CardTitle className="text-base">New Material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input required placeholder="Name (e.g. 3mm Acrylic Sheet)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input required placeholder="Category (e.g. Acrylic)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <Input required placeholder="Unit (e.g. sheets)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input type="number" placeholder="Cost per unit (KES)" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Stock on hand" value={form.stockOnHand || ""} onChange={(e) => setForm({ ...form, stockOnHand: Number(e.target.value) })} />
                  <Input type="number" placeholder="Reorder threshold" value={form.reorderThreshold || ""} onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowNew(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-scale-in">
            <CardHeader>
              <CardTitle className="text-base">Edit Material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-3">
                <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input required placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <Input required placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input type="number" placeholder="Cost per unit (KES)" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Stock on hand" value={form.stockOnHand || ""} onChange={(e) => setForm({ ...form, stockOnHand: Number(e.target.value) })} />
                  <Input type="number" placeholder="Reorder threshold" value={form.reorderThreshold || ""} onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setEditing(null); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-base font-semibold mb-2">Delete Material</h2>
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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md animate-scale-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{selected.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unit</span>
                  <span className="font-medium">{selected.unit}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stock on hand</span>
                  <span className="font-medium">{selected.stockOnHand} {selected.unit}</span>
                </div>
                {selected.costPerUnit != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cost per unit</span>
                    <span className="font-medium">KES {selected.costPerUnit}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-border">
                <h4 className="text-sm font-medium mb-2">Stock Movements</h4>
                <StockMovements materialId={selected.id} unit={selected.unit} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
