"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { uploadPhoto } from "@/lib/uploadPhoto";
import { formatDistanceToNow } from "date-fns";

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ["ASSIGNED", "SEARCHING"],
  ASSIGNED: ["SEARCHING"],
  SEARCHING: ["FOUND", "UNAVAILABLE"],
  REASSIGNED: ["SEARCHING"],
  FOUND: ["SAMPLE_COLLECTED", "AWAITING_APPROVAL"],
  SAMPLE_COLLECTED: ["AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["PURCHASED", "UNAVAILABLE"],
  PURCHASED: ["BRANDING_IN_PROGRESS"],
  BRANDING_IN_PROGRESS: ["BRANDING_COMPLETE"],
  BRANDING_COMPLETE: ["DISTRIBUTED"],
  DISTRIBUTED: [],
  UNAVAILABLE: ["PENDING"],
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const [vendorId, setVendorId] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");

  const [brandingVendorId, setBrandingVendorId] = useState("");
  const [brandingMethod, setBrandingMethod] = useState("");
  const [brandingCost, setBrandingCost] = useState("");

  const [showDistribute, setShowDistribute] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [distQuantity, setDistQuantity] = useState("");
  const [distNotes, setDistNotes] = useState("");

  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch(`/api/tasks/${id}`);
    setTask(await res.json());
    fetch("/api/employees").then((r) => r.json()).then(setEmployees);
    fetch("/api/vendors").then((r) => r.json()).then(setVendors);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  if (!task || !loaded) return <p className="text-sm text-gray-500">Loading…</p>;

  const sourcingVendors = vendors.filter((v: any) => v.type === "SOURCING" || v.type === "BOTH");
  const brandingVendors = vendors.filter((v: any) => v.type === "BRANDING" || v.type === "BOTH");

  const totalDistributed = (task.distributions || []).reduce((sum: number, d: any) => sum + d.quantity, 0);
  const remainingToDistribute = Math.max(task.quantityNeeded - totalDistributed, 0);

  async function updateStatus(status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        vendorId: vendorId || undefined,
        quotedPrice: quotedPrice ? Number(quotedPrice) : undefined,
        brandingVendorId: brandingVendorId || undefined,
        brandingMethod: brandingMethod || undefined,
        brandingCost: brandingCost ? Number(brandingCost) : undefined,
      }),
    });
    load();
  }

  async function submitReassign() {
    if (!reassignTo) return;
    await fetch(`/api/tasks/${id}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newAssigneeId: reassignTo, reason: reassignReason }),
    });
    setShowReassign(false);
    setReassignTo("");
    setReassignReason("");
    load();
  }

  async function submitComment() {
    if (!comment.trim()) return;
    await fetch(`/api/tasks/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    setComment("");
    load();
  }

  async function submitDistribution() {
    if (!recipientName || !distQuantity) return;
    await fetch(`/api/tasks/${id}/distribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName,
        recipientContact: recipientContact || undefined,
        quantity: Number(distQuantity),
        notes: distNotes || undefined,
      }),
    });
    setShowDistribute(false);
    setRecipientName("");
    setRecipientContact("");
    setDistQuantity("");
    setDistNotes("");
    load();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, kind: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file, `tasks/${id}`);
      await fetch(`/api/tasks/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind }),
      });
      load();
    } catch (err) {
      alert("Upload failed. Check Supabase Storage bucket/policy setup.");
    } finally {
      setUploading(false);
    }
  }

  const nextOptions = NEXT_STATUS[task.status] || [];
  const isBrandingStage = task.status === "PURCHASED" || task.status === "BRANDING_IN_PROGRESS";
  const canDistribute = task.status === "BRANDING_COMPLETE" || task.status === "DISTRIBUTED";

  const samplePhotos = (task.photos || []).filter((p: any) => p.kind === "SAMPLE" || !p.kind);
  const artworkPhotos = (task.photos || []).filter((p: any) => p.kind === "ARTWORK");
  const brandedProofPhotos = (task.photos || []).filter((p: any) => p.kind === "BRANDED_PROOF");

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-brand-accent hover:underline">
        ← Back
      </button>

      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">{task.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {task.material?.name} · {task.quantityNeeded} {task.material?.unit}
            </p>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <span className="text-gray-400">Assigned to:</span>{" "}
            <span className="font-medium">{task.assignedTo?.name || "Unassigned"}</span>
          </div>
          <div>
            <span className="text-gray-400">Created by:</span>{" "}
            <span className="font-medium">{task.createdBy?.name}</span>
          </div>
          {task.vendor && (
            <div>
              <span className="text-gray-400">Sourced from:</span>{" "}
              <span className="font-medium">{task.vendor.name}</span> ({task.vendor.phone})
            </div>
          )}
          {task.quotedPrice && (
            <div>
              <span className="text-gray-400">Unit price:</span>{" "}
              <span className="font-medium">{task.quotedPrice}</span>
            </div>
          )}
          {task.brandingVendor && (
            <div>
              <span className="text-gray-400">Branding partner:</span>{" "}
              <span className="font-medium">{task.brandingVendor.name}</span> ({task.brandingVendor.phone})
            </div>
          )}
          {task.brandingMethod && (
            <div>
              <span className="text-gray-400">Branding method:</span>{" "}
              <span className="font-medium">{task.brandingMethod}</span>
            </div>
          )}
          {task.brandingCost != null && (
            <div>
              <span className="text-gray-400">Branding cost:</span>{" "}
              <span className="font-medium">{task.brandingCost}</span>
            </div>
          )}
        </div>

        <button onClick={() => setShowReassign(true)} className="btn-secondary mt-4 text-xs">
          Reassign / Hand off
        </button>
      </div>

      {nextOptions.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-brand-navy mb-3">Update Status</h2>

          {!isBrandingStage && task.status !== "BRANDING_COMPLETE" && task.status !== "DISTRIBUTED" && (
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Vendor sourced from (optional)</option>
                {sourcingVendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Unit price (optional)"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}

          {isBrandingStage && (
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <select value={brandingVendorId} onChange={(e) => setBrandingVendorId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Branding partner (optional)</option>
                {brandingVendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <select value={brandingMethod} onChange={(e) => setBrandingMethod(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Branding method (optional)</option>
                <option value="Screen Print">Screen Print</option>
                <option value="Embroidery">Embroidery</option>
                <option value="Heat Transfer">Heat Transfer</option>
                <option value="Engraving">Engraving</option>
                <option value="Digital Print">Digital Print</option>
                <option value="Sublimation">Sublimation</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="number"
                placeholder="Branding cost (optional)"
                value={brandingCost}
                onChange={(e) => setBrandingCost(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {nextOptions.map((s) => (
              <button key={s} onClick={() => updateStatus(s)} className="btn-primary text-xs">
                Mark as {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {canDistribute && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-brand-navy">Distribution</h2>
            {remainingToDistribute > 0 && (
              <button onClick={() => setShowDistribute(true)} className="btn-primary text-xs">
                + Record Hand-over
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {totalDistributed} of {task.quantityNeeded} {task.material?.unit} distributed
            {remainingToDistribute > 0 && ` · ${remainingToDistribute} remaining`}
          </p>
          {(task.distributions || []).length === 0 ? (
            <p className="text-sm text-gray-500">No hand-overs recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {task.distributions.map((d: any) => (
                <li key={d.id} className="text-sm border-b border-gray-100 pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{d.recipientName}</span>
                    <span>{d.quantity} {task.material?.unit}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {d.deliveredBy?.name} · {formatDistanceToNow(new Date(d.deliveryDate), { addSuffix: true })}
                    {d.recipientContact && ` · ${d.recipientContact}`}
                  </div>
                  {d.notes && <div className="text-xs text-gray-500 mt-1">{d.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-brand-navy mb-3">Sample / Mockup Photos</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          {samplePhotos.map((p: any) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="w-24 h-24 object-cover rounded-md border" />
          ))}
        </div>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, "SAMPLE")} disabled={uploading} className="text-sm" />
      </div>

      {(isBrandingStage || task.status === "BRANDING_COMPLETE" || task.status === "DISTRIBUTED") && (
        <div className="card">
          <h2 className="font-semibold text-brand-navy mb-3">Client Artwork / Logo</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {artworkPhotos.map((p: any) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt="" className="w-24 h-24 object-cover rounded-md border" />
            ))}
          </div>
          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "ARTWORK")} disabled={uploading} className="text-sm" />
          <p className="text-xs text-gray-400 mt-1">Upload the logo/design file to hand to the branding partner.</p>

          <h3 className="font-medium text-gray-700 mt-4 mb-2 text-sm">Branded Item Proof</h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {brandedProofPhotos.map((p: any) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt="" className="w-24 h-24 object-cover rounded-md border" />
            ))}
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, "BRANDED_PROOF")} disabled={uploading} className="text-sm" />
        </div>
      )}
      {uploading && <p className="text-xs text-gray-400">Uploading…</p>}

      <div className="card">
        <h2 className="font-semibold text-brand-navy mb-3">Timeline</h2>
        <ul className="space-y-2 border-l-2 border-gray-100 pl-4">
          {task.events?.map((ev: any) => (
            <li key={ev.id} className="text-sm">
              <span className="font-medium">{ev.actor?.name}</span>{" "}
              <span className="text-gray-500">{ev.type.replace(/_/g, " ").toLowerCase()}</span>
              {ev.note && <span className="text-gray-400"> — {ev.note}</span>}
              <div className="text-xs text-gray-400">{formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true })}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="font-semibold text-brand-navy mb-3">Notes</h2>
        <ul className="space-y-2 mb-3">
          {task.comments?.map((c: any) => (
            <li key={c.id} className="text-sm border-b border-gray-100 pb-2">
              <span className="font-medium">{c.author?.name}:</span> {c.body}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button onClick={submitComment} className="btn-secondary text-sm">Add</button>
        </div>
      </div>

      {showReassign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-brand-navy mb-4">Reassign Task</h2>
            <label className="text-sm font-medium text-gray-700">New assignee</label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="mt-1 mb-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name || e.email}</option>
              ))}
            </select>
            <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
            <input
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g. Original assignee out sick"
              className="mt-1 mb-4 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReassign(false)} className="btn-secondary">Cancel</button>
              <button onClick={submitReassign} className="btn-primary">Hand off</button>
            </div>
          </div>
        </div>
      )}

      {showDistribute && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-brand-navy mb-4">Record Hand-over</h2>
            <label className="text-sm font-medium text-gray-700">Recipient</label>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. County Office - Nairobi"
              className="mt-1 mb-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <label className="text-sm font-medium text-gray-700">Recipient contact (optional)</label>
            <input
              value={recipientContact}
              onChange={(e) => setRecipientContact(e.target.value)}
              className="mt-1 mb-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <label className="text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              value={distQuantity}
              onChange={(e) => setDistQuantity(e.target.value)}
              placeholder={`Up to ${remainingToDistribute} remaining`}
              className="mt-1 mb-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <input
              value={distNotes}
              onChange={(e) => setDistNotes(e.target.value)}
              placeholder="e.g. Signed for by John at reception"
              className="mt-1 mb-4 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDistribute(false)} className="btn-secondary">Cancel</button>
              <button onClick={submitDistribution} className="btn-primary">Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
