"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  ASSIGNED: "#3b82f6",
  SEARCHING: "#f59e0b",
  FOUND: "#10b981",
  SAMPLE_COLLECTED: "#8b5cf6",
  AWAITING_APPROVAL: "#f97316",
  PURCHASED: "#06b6d4",
  BRANDING_IN_PROGRESS: "#ec4899",
  BRANDING_COMPLETE: "#22c55e",
  DISTRIBUTED: "#10b981",
  UNAVAILABLE: "#ef4444",
  REASSIGNED: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  SEARCHING: "Searching",
  FOUND: "Found",
  SAMPLE_COLLECTED: "Sample",
  AWAITING_APPROVAL: "Approval",
  PURCHASED: "Purchased",
  BRANDING_IN_PROGRESS: "Branding",
  BRANDING_COMPLETE: "Done",
  DISTRIBUTED: "Distributed",
  UNAVAILABLE: "N/A",
  REASSIGNED: "Reassigned",
};

type DashboardChartsProps = {
  tasksByStatus: Record<string, number>;
  materialsByCategory: Record<string, number>;
};

export default function DashboardCharts({ tasksByStatus, materialsByCategory }: DashboardChartsProps) {
  const taskData = Object.entries(tasksByStatus)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      count,
      fill: STATUS_COLORS[status] || "#94a3b8",
    }))
    .sort((a, b) => b.count - a.count);

  const materialData = Object.entries(materialsByCategory)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      name: category,
      value: count,
    }));

  const MATERIAL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Tasks by Status Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {taskData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No task data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={taskData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Materials by Category Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Materials by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {materialData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No material data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={materialData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {materialData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={MATERIAL_COLORS[index % MATERIAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
