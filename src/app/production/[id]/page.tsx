import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  Clock,
  FileText,
  Link2,
  Hash,
  ClipboardList,
} from "lucide-react";

const statusVariant = (s: string) => {
  switch (s) {
    case "QUEUED":
      return "secondary" as const;
    case "IN_PROGRESS":
      return "default" as const;
    case "ON_HOLD":
      return "warning" as const;
    case "COMPLETED":
      return "success" as const;
    case "CANCELLED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const statusLabel = (s: string) =>
  s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default async function ProductionJobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  const organizationId = user.organizationId as string;

  const { data: job } = await supabaseAdmin
    .from("production_jobs")
    .select(
      "*, assignedTo:users(id, name), customerOrder:customer_orders(id, customerName, orderNumber)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!job || job.organizationId !== organizationId) notFound();

  const { data: materials } = await supabaseAdmin
    .from("production_materials")
    .select(
      "*, material:materials(id, name, unit), issuedByUser:users(id, name)"
    )
    .eq("productionJobId", params.id)
    .order("issuedAt", { ascending: false });

  const materialsList = materials ?? [];

  return (
    <div className="space-y-6">
      <Reveal>
        <Link
          href="/production"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Production
        </Link>
      </Reveal>

      <Reveal delay={80}>
        <div className="card-glass rounded-2xl p-6 md:p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {job.title}
                </h1>
                {job.customerOrder && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {job.customerOrder.customerName} &middot;{" "}
                    {job.customerOrder.orderNumber}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={statusVariant(job.status)} className="text-xs">
              {statusLabel(job.status)}
            </Badge>
          </div>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Reveal delay={160}>
          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm font-semibold">
                  {job.assignedTo?.name || "Unassigned"}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Est. / Actual Hours
                </p>
                <p className="text-sm font-semibold">
                  {job.estimatedHours != null ? `${job.estimatedHours}h` : "—"}
                  {job.actualHours != null ? ` / ${job.actualHours}h` : ""}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm font-semibold">
                  {job.dueDate
                    ? new Date(job.dueDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "No due date"}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {job.customerOrder && (
          <Reveal delay={280}>
            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Linked Order
                  </p>
                  <Link
                    href={`/orders`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {job.customerOrder.orderNumber}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {job.estimatedHours != null && job.actualHours != null && (
          <Reveal delay={320}>
            <div className="card-glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Variance</p>
                  <p className="text-sm font-semibold">
                    {job.actualHours - job.estimatedHours > 0 ? "+" : ""}
                    {job.actualHours - job.estimatedHours}h
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {job.notes && (
        <Reveal delay={360}>
          <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Notes</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.notes}
            </p>
          </div>
        </Reveal>
      )}

      <Reveal delay={400}>
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              Materials Issued ({materialsList.length})
            </h2>
          </div>

          {materialsList.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No materials issued to this job yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left font-medium text-muted-foreground py-2.5 pr-4">
                      Material
                    </th>
                    <th className="text-right font-medium text-muted-foreground py-2.5 px-4">
                      Qty Used
                    </th>
                    <th className="text-left font-medium text-muted-foreground py-2.5 px-4">
                      Unit
                    </th>
                    <th className="text-left font-medium text-muted-foreground py-2.5 px-4">
                      Issued By
                    </th>
                    <th className="text-right font-medium text-muted-foreground py-2.5 pl-4">
                      Issued At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materialsList.map((m: any) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {m.material?.name || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {m.quantityUsed}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {m.material?.unit || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {m.issuedByUser?.name || "—"}
                      </td>
                      <td className="py-3 pl-4 text-right text-muted-foreground font-mono text-xs">
                        {m.issuedAt
                          ? new Date(m.issuedAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
