"use client";

import { useEffect, useState } from "react";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", unit: "", stockOnHand: 0, reorderThreshold: 0 });
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/materials");
    setMaterials(await res.json());
    setLoading(false);
    setEntered(true);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand-navy">Materials Catalogue</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Material</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((m) => {
              const low = m.stockOnHand <= m.reorderThreshold;
              return (
                <div key={m.id} className="card">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{m.name}</h3>
                    {low && <span className="badge bg-red-100 text-red-700">Low Stock</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{m.category}</p>
                  <p className="text-sm mt-2">
                    {m.stockOnHand} {m.unit} on hand
                    <span className="text-gray-400"> · reorder at {m.reorderThreshold}</span>
                  </p>
                  {m.vendorLinks?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Cheapest: {m.vendorLinks[0]?.vendor?.name} — ${m.vendorLinks.sort((a: any, b: any) => a.price - b.price)[0]?.price}
                    </p>
                  )}
                </div>
              );
            })}
            {materials.length === 0 && <p className="text-sm text-gray-500">No materials yet.</p>}
          </div>

        </>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-brand-navy mb-4">New Material</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input required placeholder="Name (e.g. 3mm Acrylic Sheet)" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input required placeholder="Category (e.g. Acrylic)" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input required placeholder="Unit (e.g. sheets)" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input type="number" placeholder="Stock on hand" value={form.stockOnHand}
                onChange={(e) => setForm({ ...form, stockOnHand: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input type="number" placeholder="Reorder threshold" value={form.reorderThreshold}
                onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
