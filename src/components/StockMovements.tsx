"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, MinusCircle, PlusCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  actor: { id: string; name: string } | null;
  createdAt: string;
};

const MOVEMENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badgeVariant: "default" | "secondary" | "danger" | "warning" }> = {
  RECEIVED: { label: "Received", icon: ArrowDownCircle, color: "text-emerald-500", badgeVariant: "default" },
  ISSUED: { label: "Issued", icon: ArrowUpCircle, color: "text-blue-500", badgeVariant: "secondary" },
  ADJUSTED: { label: "Adjusted", icon: RotateCcw, color: "text-amber-500", badgeVariant: "warning" },
  RETURNED: { label: "Returned", icon: PlusCircle, color: "text-emerald-500", badgeVariant: "default" },
  SCRAPPED: { label: "Scrapped", icon: MinusCircle, color: "text-red-500", badgeVariant: "danger" },
};

export default function StockMovements({ materialId, unit }: { materialId: string; unit: string }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ type: "RECEIVED", quantity: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/materials/${materialId}/movements`);
    setMovements(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [materialId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/materials/${materialId}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to record movement");
      setSaving(false);
      return;
    }
    setShowNew(false);
    setForm({ type: "RECEIVED", quantity: "", notes: "" });
    setSaving(false);
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Stock Movements</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
          <PlusCircle className="h-4 w-4 mr-1" /> Record
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No movements recorded yet</p>
        ) : (
          <div className="space-y-3">
            {movements.map((m) => {
              const cfg = MOVEMENT_CONFIG[m.type] || MOVEMENT_CONFIG.ADJUSTED;
              const Icon = cfg.icon;
              const sign = m.type === "ADJUSTED" ? "= " : m.type === "ISSUED" || m.type === "SCRAPPED" ? "- " : "+ ";
              return (
                <div key={m.id} className="flex items-start gap-3 text-sm">
                  <div className={`mt-0.5 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.badgeVariant} className="text-[10px]">
                        {cfg.label}
                      </Badge>
                      <span className="font-medium font-mono">
                        {sign}{m.quantity} {unit}
                      </span>
                    </div>
                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.actor?.name || "Unknown"} &middot; {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-sm animate-scale-in">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">Record Stock Movement</h2>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowNew(false); setError(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(MOVEMENT_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({ ...form, type: key })}
                          className={`rounded-lg border p-2 text-xs font-medium text-left transition-all ${
                            form.type === key
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border/50 hover:bg-muted/50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 mb-1 ${cfg.color}`} />
                          <br />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    placeholder={`Quantity (${unit})`}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                  <Input
                    placeholder="Notes (optional)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => { setShowNew(false); setError(""); }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Record"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
