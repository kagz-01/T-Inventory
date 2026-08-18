"use client";

import { useEffect, useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  SOURCING: "Sourcing",
  BRANDING: "Branding",
  BOTH: "Sourcing + Branding",
};

const TYPE_STYLES: Record<string, string> = {
  SOURCING: "bg-blue-100 text-blue-700",
  BRANDING: "bg-orange-100 text-orange-700",
  BOTH: "bg-purple-100 text-purple-700",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [form, setForm] = useState({ name: "", type: "SOURCING", address: "", contactName: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/vendors");
    setVendors(await res.json());
    setLoading(false);
    setEntered(true);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowNew(false);
    setForm({ name: "", type: "SOURCING", address: "", contactName: "", phone: "", email: "" });
    load();
  }

  const filtered = filterType ? vendors.filter((v) => v.type === filterType) : vendors;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold text-brand-navy">Vendor Directory</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Vendor</button>
      </div>

      <div className="flex gap-2">
        {["", "SOURCING", "BRANDING", "BOTH"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filterType === t ? "bg-brand-navy text-white border-brand-navy" : "border-gray-300 text-gray-600"
            }`}
          >
            {t === "" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <div key={v.id} className="card">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-800">{v.name}</h3>
                  <span className={`badge ${TYPE_STYLES[v.type] || "bg-gray-100 text-gray-600"}`}>
                    {TYPE_LABELS[v.type] || v.type}
                  </span>
                </div>
                {v.address && <p className="text-xs text-gray-400 mt-1">{v.address}</p>}
                <p className="text-sm mt-2">{v.contactName}</p>
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="text-sm text-brand-accent block">{v.phone}</a>
                )}
                {v.materialLinks?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    Supplies {v.materialLinks.length} material{v.materialLinks.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-500">No vendors yet.</p>}
          </div>

        </>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-brand-navy mb-4">New Vendor</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input required placeholder="Vendor name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="SOURCING">Sourcing (sells raw/blank products)</option>
                <option value="BRANDING">Branding (prints/embroiders/engraves)</option>
                <option value="BOTH">Both</option>
              </select>
              <input placeholder="Address" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input placeholder="Contact person" value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input placeholder="Phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <input placeholder="Email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
