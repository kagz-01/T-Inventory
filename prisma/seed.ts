import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample data…");

  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: { id: "seed-org", name: "Touchline", contactEmail: "boss@example.com" },
  });

  const boss = await prisma.user.upsert({
    where: { email: "boss@example.com" },
    update: {},
    create: { name: "The Boss", email: "boss@example.com", role: Role.ADMIN, organizationId: org.id },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "employee1@example.com" },
    update: {},
    create: { name: "Employee One", email: "employee1@example.com", role: Role.EMPLOYEE, organizationId: org.id },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@example.com" },
    update: {},
    create: { name: "Employee Two", email: "employee2@example.com", role: Role.EMPLOYEE, organizationId: org.id },
  });

  // Blank/unbranded products - these get sourced first, then sent for branding.
  const totebag = await prisma.material.create({
    data: {
      name: "Plain Canvas Tote Bag",
      category: "Bags",
      unit: "pieces",
      stockOnHand: 40,
      reorderThreshold: 50,
      organizationId: org.id,
    },
  });

  const cap = await prisma.material.create({
    data: {
      name: "Plain Cotton Cap",
      category: "Headwear",
      unit: "pieces",
      stockOnHand: 15,
      reorderThreshold: 20,
      organizationId: org.id,
    },
  });

  // Sourcing vendor - sells the blank/unbranded product
  const promoShop = await prisma.vendor.create({
    data: {
      name: "River Road Promo Supplies",
      type: "SOURCING",
      address: "River Road, Nairobi",
      contactName: "Mr. Kamau",
      phone: "+254700000001",
      email: "sales@riverroadpromo.example",
      rating: 4,
      organizationId: org.id,
    },
  });

  // Branding vendor - applies the client's logo
  const printShop = await prisma.vendor.create({
    data: {
      name: "Nairobi Screen Print & Embroidery",
      type: "BRANDING",
      address: "Industrial Area, Nairobi",
      contactName: "Ms. Njeri",
      phone: "+254700000002",
      email: "orders@nairobiprint.example",
      rating: 5,
      organizationId: org.id,
    },
  });

  await prisma.vendorMaterial.createMany({
    data: [
      { vendorId: promoShop.id, materialId: totebag.id, price: 350, currency: "KES", quantityAvail: 200 },
      { vendorId: promoShop.id, materialId: cap.id, price: 250, currency: "KES", quantityAvail: 100 },
    ],
  });

  const tender = await prisma.project.create({
    data: {
      name: "County Government Branding Tender",
      clientName: "County Government",
      organizationId: org.id,
    },
  });

  // Example task worked all the way through: sourced, branded, and partially distributed.
  const task = await prisma.sourcingTask.create({
    data: {
      title: "200 branded tote bags for county tender",
      materialId: totebag.id,
      quantityNeeded: 200,
      status: "BRANDING_COMPLETE",
      priority: "HIGH",
      projectId: tender.id,
      assignedToId: employee1.id,
      createdById: boss.id,
      organizationId: org.id,
      vendorId: promoShop.id,
      quotedPrice: 350,
      brandingVendorId: printShop.id,
      brandingMethod: "Screen Print",
      brandingCost: 120,
    },
  });

  await prisma.taskEvent.createMany({
    data: [
      { taskId: task.id, actorId: boss.id, type: "CREATED", note: "Seeded example task" },
      { taskId: task.id, actorId: employee1.id, type: "VENDOR_LINKED", toValue: promoShop.id },
      { taskId: task.id, actorId: employee1.id, type: "STATUS_CHANGED", fromValue: "AWAITING_APPROVAL", toValue: "PURCHASED" },
      { taskId: task.id, actorId: employee1.id, type: "BRANDING_VENDOR_LINKED", toValue: printShop.id },
      { taskId: task.id, actorId: employee1.id, type: "STATUS_CHANGED", fromValue: "PURCHASED", toValue: "BRANDING_IN_PROGRESS" },
      { taskId: task.id, actorId: employee1.id, type: "STATUS_CHANGED", fromValue: "BRANDING_IN_PROGRESS", toValue: "BRANDING_COMPLETE" },
    ],
  });

  // A second task still early in the pipeline, to show the board isn't just one column.
  const capTask = await prisma.sourcingTask.create({
    data: {
      title: "100 branded caps for county tender",
      materialId: cap.id,
      quantityNeeded: 100,
      status: "SEARCHING",
      priority: "NORMAL",
      projectId: tender.id,
      assignedToId: employee2.id,
      createdById: boss.id,
      organizationId: org.id,
    },
  });
  await prisma.taskEvent.create({
    data: { taskId: capTask.id, actorId: boss.id, type: "CREATED" },
  });

  await prisma.invite.upsert({
    where: { token: "seed-invite-token" },
    update: {},
    create: {
      token: "seed-invite-token",
      email: "newhire@example.com",
      role: Role.EMPLOYEE,
      organizationId: org.id,
      invitedById: boss.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete.");
  console.log({ org: org.name, boss: boss.email, employee1: employee1.email, employee2: employee2.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
