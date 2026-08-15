import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, isAdmin } from "@/lib/permissions";
import { taskStatusUpdateSchema } from "@/lib/validation";
import { logTaskEvent } from "@/lib/taskEvents";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.sourcingTask.findUnique({
    where: { id: params.id },
    include: {
      material: true,
      vendor: true,
      brandingVendor: true,
      project: true,
      assignedTo: { select: { id: true, name: true, image: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
      photos: true,
      distributions: {
        include: { deliveredBy: { select: { id: true, name: true } } },
        orderBy: { deliveryDate: "desc" },
      },
      comments: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      events: {
        include: { actor: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

// Updates status and the details relevant to whichever stage the task is entering:
// Searching -> Found (vendor + price) -> Sample Collected -> Awaiting Approval -> Purchased
// -> Branding In Progress (branding vendor + method + cost + artwork) -> Branding Complete
// -> Distributed (see /distribute route for the actual per-recipient records)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = taskStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.sourcingTask.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: parsed.data.vendorId } });
    if (!vendor || vendor.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
  }
  if (parsed.data.brandingVendorId) {
    const bVendor = await prisma.vendor.findUnique({ where: { id: parsed.data.brandingVendorId } });
    if (!bVendor || bVendor.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Branding vendor not found" }, { status: 404 });
    }
  }

  // PURCHASED: raw/blank stock arrives - increment stock on hand.
  const isPurchaseCompletion = parsed.data.status === "PURCHASED" && existing.status !== "PURCHASED";

  const task = await prisma.sourcingTask.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      vendorId: parsed.data.vendorId ?? existing.vendorId,
      quotedPrice: parsed.data.quotedPrice ?? existing.quotedPrice,
      brandingVendorId: parsed.data.brandingVendorId ?? existing.brandingVendorId,
      brandingMethod: parsed.data.brandingMethod ?? existing.brandingMethod,
      brandingCost: parsed.data.brandingCost ?? existing.brandingCost,
      artworkUrl: parsed.data.artworkUrl ?? existing.artworkUrl,
    },
  });

  await logTaskEvent({
    taskId: task.id,
    actorId: user.id,
    type: "STATUS_CHANGED",
    fromValue: existing.status,
    toValue: parsed.data.status,
    note: parsed.data.note,
  });

  if (parsed.data.vendorId && parsed.data.vendorId !== existing.vendorId) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "VENDOR_LINKED", toValue: parsed.data.vendorId });
  }
  if (parsed.data.brandingVendorId && parsed.data.brandingVendorId !== existing.brandingVendorId) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "BRANDING_VENDOR_LINKED", toValue: parsed.data.brandingVendorId });
  }
  if (parsed.data.artworkUrl && parsed.data.artworkUrl !== existing.artworkUrl) {
    await logTaskEvent({ taskId: task.id, actorId: user.id, type: "ARTWORK_UPLOADED" });
  }

  if (isPurchaseCompletion) {
    await prisma.material.update({
      where: { id: task.materialId },
      data: { stockOnHand: { increment: task.quantityNeeded } },
    });
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Only Admin can delete tasks" }, { status: 403 });
  }

  const existing = await prisma.sourcingTask.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.sourcingTask.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
