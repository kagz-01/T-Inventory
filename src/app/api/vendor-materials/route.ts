import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { vendorMaterialSchema } from "@/lib/validation";

// Creates or updates the price/quantity a vendor offers for a material.
// Upsert on (vendorId, materialId) since that pair is unique.
export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role) && user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = vendorMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Both sides of the link must belong to the caller's org, or a stray id could
  // be used to leak/mutate price data across organizations.
  const [vendor, material] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: parsed.data.vendorId } }),
    prisma.material.findUnique({ where: { id: parsed.data.materialId } }),
  ]);
  if (!vendor || vendor.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const link = await prisma.vendorMaterial.upsert({
    where: {
      vendorId_materialId: {
        vendorId: parsed.data.vendorId,
        materialId: parsed.data.materialId,
      },
    },
    update: {
      price: parsed.data.price,
      currency: parsed.data.currency,
      quantityAvail: parsed.data.quantityAvail,
      lastCheckedAt: new Date(),
    },
    create: parsed.data,
  });

  return NextResponse.json(link, { status: 201 });
}

// Price comparison: ?materialId=xxx returns all vendor prices for that material, cheapest first
export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");
  if (!materialId) {
    return NextResponse.json({ error: "materialId query param required" }, { status: 400 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material || material.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const links = await prisma.vendorMaterial.findMany({
    where: { materialId },
    include: { vendor: true },
    orderBy: { price: "asc" },
  });

  return NextResponse.json(links);
}
