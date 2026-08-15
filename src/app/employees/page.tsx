"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function EmployeesPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employees");
    setEmployees(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(id: string, role: string) {
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy animate-fade-in-up">Employees</h1>
      <p className="text-sm text-gray-500 animate-fade-in-up">
        Workload view — see who's free to pick up a reassigned task.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <div key={e.id} className="card animate-fade-in-up">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-800">{e.name || e.email}</h3>
                  <p className="text-xs text-gray-400">{e.email}</p>
                </div>
                {isAdmin ? (
                  <select
                    value={e.role}
                    onChange={(ev) => updateRole(e.id, ev.target.value)}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                ) : (
                  <span className="badge bg-gray-100 text-gray-600">{e.role}</span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">
                  {e.tasksAssigned?.length || 0} open task{e.tasksAssigned?.length === 1 ? "" : "s"}
                </p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {e.tasksAssigned?.slice(0, 3).map((t: any) => (
                    <li key={t.id}>• {t.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
