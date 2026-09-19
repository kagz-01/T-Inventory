import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, DollarSign, Package, Truck, FileText } from "lucide-react";

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SUBMITTED: "border text-foreground",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-danger text-danger-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PARTIAL: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_BADGE_STYLES[status] || "bg-muted text-muted-foreground";
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (!user.organizationId) redirect("/");

  const { id } = params;

  const { data: po } = await supabaseAdmin
    .from("purchase_orders")
    .select("*, supplier:suppliers(id, name, contactEmail, contactPhone, contactPerson)")
    .eq("id", id)
    .maybeSingle();

  if (!po || po.organizationId !== user.organizationId) {
    notFound();
  }

  const { data: items } = await supabaseAdmin
    .from("purchase_order_items")
    .select("*, material:materials(id, name, unit)")
    .eq("purchaseOrderId", id);

  const lineItems = items ?? [];
  const supplier = po.supplier as any;

  const totalEstimate = lineItems.reduce(
    (sum: number, item: any) => sum + (item.unitCost ?? 0) * (item.quantity ?? 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/suppliers/purchase-orders"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-display">
                Purchase Order
              </h1>
              <StatusBadge status={po.status} />
            </div>
            {supplier?.name && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {supplier.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content — line items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
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
                      <th className="text-left font-medium text-muted-foreground px-6 pb-3">
                        Material
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-4 pb-3 w-24">
                        Qty Ordered
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-4 pb-3 w-24">
                        Qty Received
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 pb-3 w-28">
                        Unit Cost
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-6 pb-3 w-28">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item: any) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-6 py-3">
                          <p className="font-medium">
                            {item.material?.name ?? "Unknown Material"}
                          </p>
                          {item.material?.unit && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Unit: {item.material.unit}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {item.quantityReceived ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {item.unitCost != null
                            ? `KES ${item.unitCost.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          {item.unitCost != null
                            ? `KES ${(
                                item.unitCost * item.quantity
                              ).toLocaleString()}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td colSpan={4} className="px-6 py-3 font-bold text-right">
                        Total Estimate
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-lg">
                        KES {totalEstimate.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
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
        </div>

        {/* Sidebar — supplier info & details */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Supplier
            </h2>
            <div className="space-y-3">
              {supplier?.name && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p className="text-sm font-medium">{supplier.name}</p>
                </div>
              )}
              {supplier?.contactPerson && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Contact Person</p>
                  <p className="text-sm font-medium">{supplier.contactPerson}</p>
                </div>
              )}
              {supplier?.contactEmail && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-medium">{supplier.contactEmail}</p>
                </div>
              )}
              {supplier?.contactPhone && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-sm font-medium">{supplier.contactPhone}</p>
                </div>
              )}
              {!supplier?.name && (
                <p className="text-sm text-muted-foreground italic">
                  No supplier information
                </p>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="card-glass rounded-2xl p-6">
            <h2 className="text-base font-bold font-display mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <div className="mt-1">
                  <StatusBadge status={po.status} />
                </div>
              </div>
              {po.expectedDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Expected Date</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(po.expectedDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total Estimate</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  KES {totalEstimate.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                <p className="text-sm font-medium">
                  {new Date(po.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="card-glass rounded-2xl p-6">
              <h2 className="text-base font-bold font-display mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notes
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {po.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
