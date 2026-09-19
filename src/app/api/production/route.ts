import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgUser } from "@/lib/permissions";
import { productionJobSchema } from "@/lib/validation";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const assignedToId = searchParams.get("assignedToId") || undefined;

  let q = supabaseAdmin
    .from("production_jobs")
    .select("*, assignedTo:users(id, name), customerOrder:customer_orders(id, customerName, orderNumber)")
    .eq("organizationId", user.organizationId)
    .order("createdAt", { ascending: false });

  if (status) q = q.eq("status", status);
  if (assignedToId) q = q.eq("assignedToId", assignedToId);

  const { data: jobs } = await q;
  return NextResponse.json(jobs ?? []);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = productionJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: job } = await supabaseAdmin
    .from("production_jobs")
    .insert({
      id: randomUUID(),
      ...parsed.data,
      status: parsed.data.status ?? "QUEUED",
      organizationId: user.organizationId,
      createdById: user.id,
    })
    .select("*, assignedTo:users(id, name), customerOrder:customer_orders(id, customerName, orderNumber)")
    .maybeSingle();

  if (job) {
    logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: "JOB_CREATED",
      entityType: "production_job",
      entityId: job.id,
      metadata: { name: parsed.data.title },
    });
  }

  return NextResponse.json(job, { status: 201 });
}
