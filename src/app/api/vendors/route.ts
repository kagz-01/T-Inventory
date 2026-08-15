import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgUser, canManageCatalogue } from "@/lib/permissions";
import { vendorSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const type = searchParams.get("type") || undefined; // SOURCING | BRANDING | BOTH

  const vendors = await prisma.vendor.findMany({
    where: {
      organizationId: user.organizationId,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
      type: type ? (type as any) : undefined,
    },
    include: {
      materialLinks: { include: { material: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const user = await requireOrgUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageCatalogue(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vendor = await prisma.vendor.create({
    data: { ...parsed.data, organizationId: user.organizationId },
  });
  return NextResponse.json(vendor, { status: 201 });
}
