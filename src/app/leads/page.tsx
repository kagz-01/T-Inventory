"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  X,
  ExternalLink,
} from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  contacted: "secondary",
  converted: "outline",
  closed: "destructive",
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
    fetch("/api/materials")
      .then((r) => r.json())
      .then(setMaterials);
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quote and site-visit requests from the Touchline websites
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "All" },
          { value: "new", label: "New" },
          { value: "contacted", label: "Contacted" },
          { value: "converted", label: "Converted" },
          { value: "closed", label: "Closed" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64 mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No leads yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Leads from the Touchline websites will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.fullName}</span>
                      <Badge variant={STATUS_VARIANTS[lead.status] || "secondary"}>
                        {lead.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {BRAND_LABELS[lead.brand] || lead.brand} ·{" "}
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </a>
                    {lead.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid sm:grid-cols-3 gap-2 mt-3 text-sm">
                  {lead.service && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-xs">{lead.service}</span>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="text-xs truncate">{lead.location}</span>
                    </div>
                  )}
                  {lead.preferredDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="text-xs">
                        {new Date(lead.preferredDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {lead.message && (
                  <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-border pl-3">
                    &ldquo;{lead.message}&rdquo;
                  </p>
                )}

                {/* Actions */}
                {lead.status !== "converted" && (
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
                    {lead.status === "new" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateStatus(lead.id, "contacted")}
                      >
                        Mark Contacted
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setConvertingLead(lead)}
                    >
                      Convert to Task
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    {lead.status !== "closed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground ml-auto"
                        onClick={() => updateStatus(lead.id, "closed")}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                )}

                {lead.convertedTaskId && (
                  <a
                    href={`/tasks/${lead.convertedTaskId}`}
                    className="inline-flex items-center gap-1 text-xs font-medium mt-3 hover:underline"
                  >
                    View converted task
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Convert Modal */}
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Convert to Task</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                From {lead.fullName}&apos;s enquiry ({lead.service || "no service"})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Material</label>
              <select
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select material…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Add it on the Materials page first if needed.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Quantity Needed</label>
              <Input
                type="number"
                min={0.01}
                step="any"
                required
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Assign To (optional)</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || e.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Converting…" : "Create Task"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
