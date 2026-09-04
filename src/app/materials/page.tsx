"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, AlertTriangle } from "lucide-react";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    stockOnHand: 0,
    reorderThreshold: 0,
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/materials");
    setMaterials(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
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
    setForm({ name: "", category: "", unit: "", stockOnHand: 0, reorderThreshold: 0 });
    load();
  }

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
          {materials.map((m) => {
            const low = m.stockOnHand <= m.reorderThreshold;
            return (
              <Card
                key={m.id}
                className={`hover:shadow-md transition-all ${low ? "border-red-200 dark:border-red-800" : ""}`}
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
                    {low && (
                      <Badge variant="danger" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low
                      </Badge>
                    )}
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
                          {m.vendorLinks.sort((a: any, b: any) => a.price - b.price)[0]?.vendor?.name} — $
                          {m.vendorLinks.sort((a: any, b: any) => a.price - b.price)[0]?.price}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {materials.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No materials yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your first material to get started
                </p>
                <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" />
                  Add Material
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-scale-in">
            <CardHeader>
              <CardTitle className="text-base">New Material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input
                  required
                  placeholder="Name (e.g. 3mm Acrylic Sheet)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  required
                  placeholder="Category (e.g. Acrylic)"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
                <Input
                  required
                  placeholder="Unit (e.g. sheets)"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Stock on hand"
                    value={form.stockOnHand || ""}
                    onChange={(e) =>
                      setForm({ ...form, stockOnHand: Number(e.target.value) })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Reorder threshold"
                    value={form.reorderThreshold || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reorderThreshold: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNew(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
