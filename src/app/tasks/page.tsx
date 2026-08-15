"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import NewTaskModal from "@/components/NewTaskModal";

const COLUMNS = [
  "PENDING",
  "ASSIGNED",
  "SEARCHING",
  "REASSIGNED",
  "FOUND",
  "SAMPLE_COLLECTED",
  "AWAITING_APPROVAL",
  "PURCHASED",
  "BRANDING_IN_PROGRESS",
  "BRANDING_COMPLETE",
  "DISTRIBUTED",
  "UNAVAILABLE",
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [entered, setEntered] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
    setLoading(false);
    setEntered(true);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand-navy">Sourcing Tasks</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          + New Task
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading tasks…</p>
      ) : (
        <Enter>{entered && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((status) => {
              const items = tasks.filter((t) => t.status === status);
              return (
                <Enter key={status} className="animate-slide-in" style="animation-delay: 0.1s;">
                  <div className="min-w-[260px] flex-shrink-0">
                    <div className="mb-2">
                      <StatusBadge status={status} /> <span className="text-xs text-gray-400">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t) => (
                        <Link
                          key={t.id}
                          href={`/tasks/${t.id}`}
                          className="card block hover:shadow-md transition-shadow"
                        >
                          <div className="font-medium text-sm text-gray-800">{t.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {t.material?.name} · {t.quantityNeeded} {t.material?.unit}
                          </div>
                          <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                            <span>{t.assignedTo?.name || "Unassigned"}</span>
                            {t.priority !== "NORMAL" && (
                              <span className="text-amber-600 font-medium">{t.priority}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                      {items.length === 0 && (
                        <div className="text-xs text-gray-300 italic px-1">No tasks</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      )}

      {showNew && (
        <NewTaskModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}
