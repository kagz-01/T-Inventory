import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // inventory | purchases | sales | production | employees
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const orgId = user.organizationId;

  const dateFilter = (col: string) => {
    let q = supabaseAdmin.from(col).select("*").eq("organizationId", orgId);
    if (from) q = q.gte("createdAt", from);
    if (to) q = q.lte("createdAt", to);
    return q;
  };

  switch (type) {
    case "inventory": {
      const { data: materials } = await supabaseAdmin
        .from("materials")
        .select("*")
        .eq("organizationId", orgId);

      const { data: movements } = await supabaseAdmin
        .from("stock_movements")
        .select("*, material:materials(id, name, unit)")
        .eq("organizationId", orgId)
        .order("createdAt", { ascending: false });

      const list = materials ?? [];
      const lowStock = list.filter((m) => m.stockOnHand <= m.reorderThreshold);
      const totalItems = list.reduce((sum, m) => sum + m.stockOnHand, 0);
      const totalValue = list.reduce((sum, m) => sum + (m.stockOnHand * (m.costPerUnit || 0)), 0);

      return NextResponse.json({
        materials: list,
        lowStock,
        totalItems,
        totalValue,
        movements: movements ?? [],
      });
    }

    case "purchases": {
      const { data: pos } = await supabaseAdmin
        .from("purchase_orders")
        .select("*, supplier:vendors(id, name)")
        .eq("organizationId", orgId)
        .order("createdAt", { ascending: false });

      const { data: items } = await supabaseAdmin
        .from("purchase_order_items")
        .select("*, purchase_order:purchase_orders(id, organizationId, createdAt)")
        .eq("purchase_order.organizationId", orgId);

      const poList = pos ?? [];
      const totalSpend = poList.reduce((sum, po) => sum + (po.totalEstimate || 0), 0);
      const pendingPOs = poList.filter((p) => p.status === "DRAFT" || p.status === "SUBMITTED");

      return NextResponse.json({
        purchaseOrders: poList,
        totalSpend,
        pendingCount: pendingPOs.length,
        items: items ?? [],
      });
    }

    case "sales": {
      const { data: orders } = await supabaseAdmin
        .from("customer_orders")
        .select("*")
        .eq("organizationId", orgId)
        .order("createdAt", { ascending: false });

      const orderList = orders ?? [];
      const totalRevenue = orderList.reduce((sum, o) => sum + (o.quotedAmount || 0), 0);
      const totalPaid = orderList.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const pending = orderList.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
      const byType = orderList.reduce((acc, o) => {
        acc[o.orderType] = (acc[o.orderType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        orders: orderList,
        totalRevenue,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
        pendingCount: pending.length,
        byType,
      });
    }

    case "production": {
      const { data: jobs } = await supabaseAdmin
        .from("production_jobs")
        .select("*, assignedTo:users(id, name), customerOrder:customer_orders(id, customerName)")
        .eq("organizationId", orgId)
        .order("createdAt", { ascending: false });

      const jobList = jobs ?? [];
      const completed = jobList.filter((j) => j.status === "COMPLETED");
      const inProgress = jobList.filter((j) => j.status === "IN_PROGRESS");

      return NextResponse.json({
        jobs: jobList,
        totalJobs: jobList.length,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
      });
    }

    case "employees": {
      const { data: members } = await supabaseAdmin
        .from("users")
        .select("id, name, email, role, active")
        .eq("organizationId", orgId);

      const { data: attendance } = await supabaseAdmin
        .from("attendance")
        .select("*, user:users(id, name)")
        .eq("organizationId", orgId);

      const { data: tasks } = await supabaseAdmin
        .from("sourcing_tasks")
        .select("id, assignedToId, status, lastActivityAt")
        .eq("organizationId", orgId);

      const memberList = members ?? [];
      const activeMembers = memberList.filter((m) => m.active);

      return NextResponse.json({
        members: memberList,
        activeCount: activeMembers.length,
        attendance: attendance ?? [],
        tasks: tasks ?? [],
      });
    }

    case "profit": {
      const [{ data: orders }, { data: pos }, { data: materials }] = await Promise.all([
        supabaseAdmin.from("customer_orders").select("*").eq("organizationId", orgId),
        supabaseAdmin.from("purchase_orders").select("*").eq("organizationId", orgId),
        supabaseAdmin.from("materials").select("*").eq("organizationId", orgId),
      ]);

      const orderList = orders ?? [];
      const poList = pos ?? [];
      const materialList = materials ?? [];

      const totalRevenue = orderList.reduce((sum, o) => sum + (o.quotedAmount || 0), 0);
      const totalPOCost = poList.reduce((sum, po) => sum + (po.totalEstimate || 0), 0);
      const totalMaterialCost = materialList.reduce((sum, m) => sum + (m.stockOnHand * (m.costPerUnit || 0)), 0);
      const totalCost = totalPOCost + totalMaterialCost;
      const grossProfit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

      return NextResponse.json({
        totalRevenue,
        totalCost,
        totalPOCost,
        totalMaterialCost,
        grossProfit,
        margin,
        ordersCount: orderList.length,
        poCount: poList.length,
      });
    }

    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
}
