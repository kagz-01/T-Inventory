-- SQL fallback seed for environments where Supabase REST API is restricted
BEGIN;

INSERT INTO organizations (id, name, createdAt, updatedAt)
VALUES ('seed-org', 'Touchline', now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updatedAt = now();

INSERT INTO users (id, name, email, role, active, createdAt, organizationId)
VALUES
  ('boss', 'The Boss', 'boss@example.com', 'ADMIN', true, now(), 'seed-org'),
  ('manager', 'Second In Command', 'manager@example.com', 'MANAGER', true, now(), 'seed-org'),
  ('employee1', 'Employee One', 'employee1@example.com', 'EMPLOYEE', true, now(), 'seed-org'),
  ('employee2', 'Employee Two', 'employee2@example.com', 'EMPLOYEE', true, now(), 'seed-org')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, organizationId = EXCLUDED.organizationId;

INSERT INTO materials (id, name, category, unit, stockOnHand, reorderThreshold, organizationId)
VALUES
  ('mat_tote', 'Plain Canvas Tote Bag', 'Bags', 'pieces', 40, 50, 'seed-org'),
  ('mat_cap', 'Plain Cotton Cap', 'Headwear', 'pieces', 15, 20, 'seed-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (id, name, type, address, contactName, phone, email, rating, organizationId)
VALUES
  ('vendor_promo', 'River Road Promo Supplies', 'SOURCING', 'River Road, Nairobi', 'Mr. Kamau', '+254700000001', 'sales@riverroadpromo.example', 4, 'seed-org'),
  ('vendor_print', 'Nairobi Screen Print & Embroidery', 'BRANDING', 'Industrial Area, Nairobi', 'Ms. Njeri', '+254700000002', 'orders@nairobiprint.example', 5, 'seed-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_materials (id, vendorId, materialId, price, currency, quantityAvail)
VALUES
  ('vm1', 'vendor_promo', 'mat_tote', 350, 'KES', 200),
  ('vm2', 'vendor_promo', 'mat_cap', 250, 'KES', 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, clientName, organizationId)
VALUES ('project_tender', 'County Government Branding Tender', 'County Government', 'seed-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sourcing_tasks (id, title, materialId, quantityNeeded, status, priority, projectId, assignedToId, createdById, organizationId, vendorId, quotedPrice, brandingVendorId, brandingMethod, brandingCost, createdAt)
VALUES
  ('task1', '200 branded tote bags for county tender', 'mat_tote', 200, 'BRANDING_COMPLETE', 'HIGH', 'project_tender', 'employee1', 'boss', 'seed-org', 'vendor_promo', 350, 'vendor_print', 'Screen Print', 120, now()),
  ('task2', '100 branded caps for county tender', 'mat_cap', 100, 'SEARCHING', 'NORMAL', 'project_tender', 'employee2', 'boss', 'seed-org', NULL, NULL, NULL, NULL, NULL, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO task_events (id, taskId, actorId, type, note, toValue, fromValue, createdAt)
VALUES
  ('te1', 'task1', 'boss', 'CREATED', 'Seeded example task', NULL, NULL, now()),
  ('te2', 'task1', 'employee1', 'VENDOR_LINKED', NULL, 'vendor_promo', NULL, now()),
  ('te3', 'task1', 'employee1', 'STATUS_CHANGED', NULL, 'PURCHASED', 'AWAITING_APPROVAL', now()),
  ('te4', 'task1', 'employee1', 'BRANDING_VENDOR_LINKED', NULL, 'vendor_print', NULL, now()),
  ('te5', 'task1', 'employee1', 'STATUS_CHANGED', NULL, 'BRANDING_IN_PROGRESS', 'PURCHASED', now()),
  ('te6', 'task1', 'employee1', 'STATUS_CHANGED', NULL, 'BRANDING_COMPLETE', 'BRANDING_IN_PROGRESS', now()),
  ('te7', 'task2', 'boss', 'CREATED', NULL, NULL, NULL, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO invites (id, token, email, role, status, expiresAt, createdAt, organizationId, invitedById)
VALUES ('invite_seed', 'seed-invite-token', 'newhire@example.com', 'EMPLOYEE', 'PENDING', now() + INTERVAL '7 days', now(), 'seed-org', 'boss')
ON CONFLICT (token) DO NOTHING;

COMMIT;
