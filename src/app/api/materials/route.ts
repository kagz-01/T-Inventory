import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { materialSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const lowStock = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search") || undefined;

  const materials = await prisma.material.findMany({
    where: {
      organizationId: user.organizationId,
      category: category || undefined,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
    },
    include: {
      photos: { take: 3 },
      vendorLinks: { include: { vendor: true } },
    },
    orderBy: { name: "asc" },
  });

  const filtered = lowStock
    ? materials.filter((m) => m.stockOnHand <= m.reorderThreshold)
    : materials;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = materialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const material = await prisma.material.create({
    data: { ...parsed.data, organizationId: user.organizationId },
  });
  return NextResponse.json(material, { status: 201 });
}
