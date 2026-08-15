"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const BRAND_LABELS: Record<string, string> = {
  branding: "Touchline Branding",
  signage: "Touchline Signage",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [convertingLead, setConvertingLead] = useState<any>(null);

  async function load() {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/leads${params}`);
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/materials").then((r) => r.json()).then(setMaterials);
    fetch("/api/employees").then((r) => r.json()).then(setEmployees);
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy animate-fade-in-up">Leads</h1>
        <p className="text-sm text-gray-500 animate-fade-in-up">
          Quote and site-visit requests submitted through the public Touchline Branding and
          Touchline Signage websites.
        </p>
      </div>

      <div className="flex gap-2">
        {["", "new", "contacted", "converted", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filter === s ? "bg-brand-navy text-white border-brand-navy" : "border-gray-300 text-gray-600"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="card animate-fade-in-up text-sm text-gray-500">No leads yet.</div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="card animate-fade-in-up">
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{lead.fullName}</span>
                    <span className={`badge ${STATUS_STYLES[lead.status] || "bg-gray-100 text-gray-600"}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {BRAND_LABELS[lead.brand] || lead.brand} ·{" "}
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <a href={`tel:${lead.phone}`} className="text-brand-accent block">{lead.phone}</a>
                  {lead.email && <span className="text-xs text-gray-400">{lead.email}</span>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mt-3 text-sm text-gray-600">
                {lead.service && <div><span className="text-gray-400">Service:</span> {lead.service}</div>}
                {lead.location && <div><span className="text-gray-400">Location:</span> {lead.location}</div>}
                {lead.preferredDate && (
                  <div>
                    <span className="text-gray-400">Preferred date:</span>{" "}
                    {new Date(lead.preferredDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              {lead.message && <p className="text-sm text-gray-600 mt-2 italic">"{lead.message}"</p>}

              {lead.status !== "converted" && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                  {lead.status === "new" && (
                    <button onClick={() => updateStatus(lead.id, "contacted")} className="btn-secondary text-xs">
                      Mark Contacted
                    </button>
                  )}
                  <button onClick={() => setConvertingLead(lead)} className="btn-primary text-xs">
                    Convert to Task
                  </button>
                  {lead.status !== "closed" && (
                    <button onClick={() => updateStatus(lead.id, "closed")} className="text-xs text-gray-400 hover:text-red-600">
                      Close (not proceeding)
                    </button>
                  )}
                </div>
              )}
              {lead.convertedTaskId && (
                <a href={`/tasks/${lead.convertedTaskId}`} className="text-xs text-brand-accent hover:underline block mt-2">
                  View converted task →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {convertingLead && (
        <ConvertModal
          lead={convertingLead}
          materials={materials}
          employees={employees}
          onClose={() => setConvertingLead(null)}
          onConverted={() => {
            setConvertingLead(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ConvertModal({
  lead,
  materials,
  employees,
  onClose,
  onConverted,
}: {
  lead: any;
  materials: any[];
  employees: any[];
  onClose: () => void;
  onConverted: () => void;
}) {
  const [materialId, setMaterialId] = useState("");
  const [quantityNeeded, setQuantityNeeded] = useState<number>(1);
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/leads/${lead.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId,
        quantityNeeded: Number(quantityNeeded),
        assignedToId: assignedToId || undefined,
        priority,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] || data.error || "Failed to convert lead");
      return;
    }
    onConverted();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-brand-navy mb-1">Convert to Sourcing Task</h2>
        <p className="text-xs text-gray-500 mb-4">
          From {lead.fullName}'s enquiry ({lead.service || "no service specified"})
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Material</label>
            <select
              required
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select material…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Doesn't exist yet? Add it on the Materials page first, then come back.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Quantity Needed</label>
            <input
              type="number" min={0.01} step="any" required
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(Number(e.target.value))}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Assign To (optional)</label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name || e.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Converting…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
