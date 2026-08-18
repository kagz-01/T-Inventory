import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run the seed.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const Role = { ADMIN: "ADMIN", EMPLOYEE: "EMPLOYEE" } as const;

async function main() {
  console.log("Seeding sample data (Supabase)…");

  const { data: org } = await supabase.from("organizations").upsert({ id: "seed-org", name: "Touchline", contactEmail: "boss@example.com" }, { onConflict: "id" }).select().maybeSingle();

  const { data: boss } = await supabase.from("users").upsert({ name: "The Boss", email: "boss@example.com", role: Role.ADMIN, organizationId: org.id }, { onConflict: "email" }).select().maybeSingle();
  const { data: employee1 } = await supabase.from("users").upsert({ name: "Employee One", email: "employee1@example.com", role: Role.EMPLOYEE, organizationId: org.id }, { onConflict: "email" }).select().maybeSingle();
  const { data: employee2 } = await supabase.from("users").upsert({ name: "Employee Two", email: "employee2@example.com", role: Role.EMPLOYEE, organizationId: org.id }, { onConflict: "email" }).select().maybeSingle();

  const { data: totebag } = await supabase.from("materials").insert({ name: "Plain Canvas Tote Bag", category: "Bags", unit: "pieces", stockOnHand: 40, reorderThreshold: 50, organizationId: org.id }).select().maybeSingle();
  const { data: cap } = await supabase.from("materials").insert({ name: "Plain Cotton Cap", category: "Headwear", unit: "pieces", stockOnHand: 15, reorderThreshold: 20, organizationId: org.id }).select().maybeSingle();

  const { data: promoShop } = await supabase.from("vendors").insert({ name: "River Road Promo Supplies", type: "SOURCING", address: "River Road, Nairobi", contactName: "Mr. Kamau", phone: "+254700000001", email: "sales@riverroadpromo.example", rating: 4, organizationId: org.id }).select().maybeSingle();
  const { data: printShop } = await supabase.from("vendors").insert({ name: "Nairobi Screen Print & Embroidery", type: "BRANDING", address: "Industrial Area, Nairobi", contactName: "Ms. Njeri", phone: "+254700000002", email: "orders@nairobiprint.example", rating: 5, organizationId: org.id }).select().maybeSingle();

  await supabase.from("vendor_materials").insert([
    { vendorId: promoShop.id, materialId: totebag.id, price: 350, currency: "KES", quantityAvail: 200 },
    { vendorId: promoShop.id, materialId: cap.id, price: 250, currency: "KES", quantityAvail: 100 },
  ]);

  const { data: tender } = await supabase.from("projects").insert({ name: "County Government Branding Tender", clientName: "County Government", organizationId: org.id }).select().maybeSingle();

  const { data: task } = await supabase.from("sourcing_tasks").insert({
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
  }).select().maybeSingle();

  await supabase.from("task_events").insert([
    { taskId: task.id, actorId: boss.id, type: "CREATED", note: "Seeded example task" },
    { taskId: task.id, actorId: employee1.id, type: "VENDOR_LINKED", toValue: promoShop.id },
    { taskId: task.id, actorId: employee1.id, type: "STATUS_CHANGED", fromValue: "AWAITING_APPROVAL", toValue: "PURCHASED" },
    { taskId: task.id, actorId: employee1.id, type: "BRANDING_VENDOR_LINKED", toValue: printShop.id },
    { taskId: task.id, actorId: employee1.id, type: "STATUS_CHANGED", fromValue: "PURCHASED", toValue: "BRANDING_IN_PROGRESS" },
    { taskId: task.id, actorId: employee1.id, type: "STATUS_CHANGED", fromValue: "BRANDING_IN_PROGRESS", toValue: "BRANDING_COMPLETE" },
  ]);

  const { data: capTask } = await supabase.from("sourcing_tasks").insert({
    title: "100 branded caps for county tender",
    materialId: cap.id,
    quantityNeeded: 100,
    status: "SEARCHING",
    priority: "NORMAL",
    projectId: tender.id,
    assignedToId: employee2.id,
    createdById: boss.id,
    organizationId: org.id,
  }).select().maybeSingle();

  await supabase.from("task_events").insert([{ taskId: capTask.id, actorId: boss.id, type: "CREATED" }]);

  await supabase.from("invites").upsert({ token: "seed-invite-token", email: "newhire@example.com", role: Role.EMPLOYEE, organizationId: org.id, invitedById: boss.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, { onConflict: 'token' });

  console.log("Seed complete.");
  console.log({ org: org.name, boss: boss.email, employee1: employee1.email, employee2: employee2.email });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
