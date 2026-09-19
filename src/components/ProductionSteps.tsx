"use client";

import { useEffect, useState } from "react";
import { Plus, Check, Loader2, Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function ProductionSteps({ jobId }: { jobId: string }) {
  const [steps, setSteps] = useState<any[]>([]);
  const [newStepName, setNewStepName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/production/${jobId}/steps`)
      .then((r) => r.json())
      .then((d) => {
        setSteps(d);
        setLoading(false);
      });
  }, [jobId]);

  const addStep = async () => {
    if (!newStepName.trim()) return;
    const res = await fetch(`/api/production/${jobId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStepName.trim() }),
    });
    if (res.ok) {
      const step = await res.json();
      setSteps([...steps, step]);
      setNewStepName("");
    }
  };

  const cycleStepStatus = async (step: any) => {
    const nextStatus =
      step.status === "PENDING" ? "IN_PROGRESS" :
      step.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";

    const res = await fetch(`/api/production/${jobId}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSteps(steps.map((s) => (s.id === step.id ? updated : s)));
    }
  };

  const deleteStep = async (stepId: string) => {
    const res = await fetch(`/api/production/${jobId}/steps/${stepId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSteps(steps.filter((s) => s.id !== stepId));
    }
  };

  const completedCount = steps.filter((s) => s.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="card-glass rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold font-display">Production Steps</h2>
        <span className="text-xs text-muted-foreground font-mono">
          {completedCount}/{steps.length} done
        </span>
      </div>

      {steps.length > 0 && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No steps added yet</p>
      ) : (
        <div className="space-y-2">
          {steps.map((step: any) => (
            <div key={step.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 group">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cycleStepStatus(step)}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    step.status === "COMPLETED" ? "bg-emerald-500 border-emerald-500 text-white" :
                    step.status === "IN_PROGRESS" ? "bg-blue-500 border-blue-500 text-white" :
                    "border-muted-foreground/30 hover:border-primary"
                  }`}
                >
                  {step.status === "COMPLETED" && <Check className="h-3 w-3" />}
                  {step.status === "IN_PROGRESS" && <Loader2 className="h-3 w-3 animate-spin" />}
                </button>
                <div>
                  <p className={`text-sm font-medium ${step.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                    {step.name}
                  </p>
                  {step.assignedTo && (
                    <p className="text-xs text-muted-foreground">Assigned to {step.assignedTo.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[step.status] || STATUS_STYLES.PENDING}`}>
                  {step.status.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => deleteStep(step.id)}
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <input
          value={newStepName}
          onChange={(e) => setNewStepName(e.target.value)}
          placeholder="Add a step..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          onKeyDown={(e) => e.key === "Enter" && addStep()}
        />
        <button onClick={addStep} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}
