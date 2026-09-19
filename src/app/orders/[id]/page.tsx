import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Reveal from "@/components/Reveal";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Package,
  FileText,
  ListTodo,
  Wrench,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  ExternalLink,
  User,
  Truck,
  ShieldCheck,
  Sparkles,
  Flag,
  Tag,
} from "lucide-react";

const ORDER_STATUS_FLOW = [
  "ENQUIRY",
  "QUOTE_SENT",
  "QUOTE_ACCEPTED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY",
  "DELIVERED",
  "INSTALLED",
  "COMPLETED",
] as const;

const STATUS_META: Record<string, { label: string; icon: React.ReactNode }> = {
  ENQUIRY: { label: "Enquiry", icon: <Circle className="h-3 w-3" /> },
  QUOTE_SENT: { label: "Quote Sent", icon: <FileText className="h-3 w-3" /> },
  QUOTE_ACCEPTED: { label: "Quote Accepted", icon: <CheckCircle2 className="h-3 w-3" /> },
  IN_PRODUCTION: { label: "In Production", icon: <Wrench className="h-3 w-3" /> },
  QUALITY_CHECK: { label: "Quality Check", icon: <ShieldCheck className="h-3 w-3" /> },
  READY: { label: "Ready", icon: <Sparkles className="h-3 w-3" /> },
  DELIVERED: { label: "Delivered", icon: <Truck className="h-3 w-3" /> },
  INSTALLED: { label: "Installed", icon: <Package className="h-3 w-3" /> },
  COMPLETED: { label: "Completed", icon: <Flag className="h-3 w-3" /> },
};

const ORDER_TYPE_STYLES: Record<string, string> = {
  SIGNAGE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BRANDING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MIXED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function StatusStep({ status, index, currentIdx }: { status: string; index: number; currentIdx: number }) {
  const meta = STATUS_META[status];
  const isCompleted = index < currentIdx;
  const isCurrent = index === currentIdx;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative flex items-center justify-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
            isCompleted
              ? "bg-emerald-500 text-white"
              : isCurrent
              ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isCurrent ? (
            <CircleDot className="h-4 w-4" />
          ) : (
            meta?.icon
          )}
        </div>
        {isCurrent && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isCompleted
              ? "text-emerald-600 dark:text-emerald-400"
              : isCurrent
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {meta?.label || status}
        </p>
        {isCurrent && <p className="text-xs text-muted-foreground">Current</p>}
      </div>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (!user.organizationId) redirect("/");

  const { id } = params;

  const { data: order } = await supabaseAdmin
    .from("customer_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.organizationId !== user.organizationId) {
    notFound();
  }

  const [{ data: items }, { data: tasks }, { data: jobs }] = await Promise.all([
    supabaseAdmin
      .from("customer_order_items")
      .select("*")
      .eq("customerOrderId", id),
    supabaseAdmin
      .from("sourcing_tasks")
      .select("id, title, status, assignedTo:users(id, name)")
      .eq("customerOrderId", id),
    supabaseAdmin
      .from("production_jobs")
      .select("id, title, status, assignedTo:users(id, name), dueDate, completedAt")
      .eq("customerOrderId", id),
  ]);

  const lineItems = items ?? [];
  const linkedTasks = tasks ?? [];
  const linkedJobs = jobs ?? [];

  const currentStatusIdx = ORDER_STATUS_FLOW.indexOf(order.status as (typeof ORDER_STATUS_FLOW)[number]);
  const isCancelled = order.status === "CANCELLED";

  const balanceDue =
    order.quotedAmount != null && order.paidAmount != null
      ? order.quotedAmount - order.paidAmount
      : order.quotedAmount ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <Reveal direction="up">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight font-display">
                  {order.customerName}
                </h1>
                <StatusBadge status={order.status} />
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    ORDER_TYPE_STYLES[order.orderType] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {order.orderType}
                </span>
              </div>
              {order.description && (
                <p className="text-sm text-muted-foreground mt-0.5 max-w-lg">
                  {order.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content — left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Progress */}
          <Reveal direction="up" delay={50}>
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Order Journey
              </h2>

              {isCancelled ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Order Cancelled</p>
                    <p className="text-xs text-red-500 dark:text-red-500">
                      This order was cancelled at the {order.status?.replace(/_/g, " ").toLowerCase()} stage.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {ORDER_STATUS_FLOW.map((status, idx) => (
                    <div key={status} className="flex items-stretch">
                      {/* Vertical connector */}
                      <div className="flex flex-col items-center mr-3">
                        <StatusStep
                          status={status}
                          index={idx}
                          currentIdx={currentStatusIdx}
                        />
                        {idx < ORDER_STATUS_FLOW.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 min-h-[1.5rem] ${
                              idx < currentStatusIdx
                                ? "bg-emerald-400"
                                : idx === currentStatusIdx
                                ? "bg-gradient-to-b from-primary to-muted"
                                : "bg-border"
                            }`}
                          />
                        )}
                      </div>
                      {/* Spacer for alignment */}
                      {idx < ORDER_STATUS_FLOW.length - 1 && <div className="pb-2" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          {/* Line Items */}
          <Reveal direction="up" delay={100}>
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                Line Items
                {lineItems.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>

              {lineItems.length > 0 ? (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-6 pb-3">Description</th>
                        <th className="text-center font-medium text-muted-foreground px-4 pb-3 w-20">Qty</th>
                        <th className="text-right font-medium text-muted-foreground px-4 pb-3 w-28">Unit Price</th>
                        <th className="text-right font-medium text-muted-foreground px-6 pb-3 w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item: any) => (
                        <tr key={item.id} className="border-b border-border/50 last:border-0">
                          <td className="px-6 py-3">
                            <p className="font-medium">{item.description}</p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {item.unitPrice != null ? `KES ${item.unitPrice.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-6 py-3 text-right font-medium">
                            {item.unitPrice != null
                              ? `KES ${(item.unitPrice * item.quantity).toLocaleString()}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {order.quotedAmount != null && (
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td colSpan={3} className="px-6 py-3 font-bold text-right">
                            Total
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-lg">
                            KES {order.quotedAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No line items yet</p>
                </div>
              )}
            </div>
          </Reveal>

          {/* Linked Tasks */}
          <Reveal direction="up" delay={150}>
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                Sourcing Tasks
                {linkedTasks.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {linkedTasks.length}
                  </span>
                )}
              </h2>

              {linkedTasks.length > 0 ? (
                <div className="space-y-2">
                  {linkedTasks.map((task: any) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={task.status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          {task.assignedTo && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignedTo.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                    <ListTodo className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No sourcing tasks linked</p>
                </div>
              )}
            </div>
          </Reveal>

          {/* Linked Production Jobs */}
          <Reveal direction="up" delay={200}>
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Production Jobs
                {linkedJobs.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {linkedJobs.length}
                  </span>
                )}
              </h2>

              {linkedJobs.length > 0 ? (
                <div className="space-y-2">
                  {linkedJobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={job.status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{job.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {job.assignedTo && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {job.assignedTo.name}
                              </span>
                            )}
                            {job.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(job.dueDate), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {job.completedAt && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                          Done
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No production jobs linked</p>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* Sidebar — right column */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Reveal direction="right" delay={50}>
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Financials
              </h2>
              <div className="space-y-3">
                {order.quotedAmount != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quoted</span>
                    <span className="text-sm font-semibold">
                      KES {order.quotedAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {order.paidAmount != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Paid</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      KES {order.paidAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {order.quotedAmount != null && (
                  <>
                    <div className="border-t border-border/50 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Balance Due</span>
                        <span
                          className={`text-sm font-bold ${
                            balanceDue > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          KES {balanceDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Paid</span>
                        <span>
                          {order.quotedAmount > 0
                            ? Math.round(((order.paidAmount ?? 0) / order.quotedAmount) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${
                              order.quotedAmount > 0
                                ? Math.min(((order.paidAmount ?? 0) / order.quotedAmount) * 100, 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
                {order.quotedAmount == null && (
                  <p className="text-sm text-muted-foreground italic">No amount quoted</p>
                )}
              </div>
            </div>
          </Reveal>

          {/* Order Details */}
          <Reveal direction="right" delay={100}>
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Order Type</p>
                  <p className="text-sm font-medium">{order.orderType}</p>
                </div>
                {order.customerContact && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Contact</p>
                    <p className="text-sm font-medium">{order.customerContact}</p>
                  </div>
                )}
                {order.dueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
                    <p className="text-sm font-medium">
                      {format(new Date(order.dueDate), "MMMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.dueDate), { addSuffix: true })}
                    </p>
                  </div>
                )}
                {order.deliveryAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Delivery Address</p>
                    <p className="text-sm font-medium flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      {order.deliveryAddress}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                  <p className="text-sm font-medium">
                    {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Last Updated</p>
                    <p className="text-sm font-medium">
                      {format(new Date(order.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Notes */}
          {order.notes && (
            <Reveal direction="right" delay={150}>
              <div className="card-glass rounded-2xl p-6">
                <h2 className="text-base font-bold font-display mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Notes
                </h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {order.notes}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
