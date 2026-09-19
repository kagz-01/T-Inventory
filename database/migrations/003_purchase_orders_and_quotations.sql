-- =============================================================================
-- Phase 3: Purchase Orders + Quotations + Supplier Performance
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- ── Purchase Orders ─────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE po_status AS ENUM ('DRAFT','SUBMITTED','PARTIAL','RECEIVED','CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
        CREATE TYPE quotation_status AS ENUM ('PENDING','ACCEPTED','REJECTED','EXPIRED');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplierId TEXT NOT NULL REFERENCES vendors(id),
  status po_status NOT NULL DEFAULT 'DRAFT',
  totalEstimate double precision,
  expectedDate date,
  notes TEXT,
  createdById TEXT NOT NULL REFERENCES users(id),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_po_org ON purchase_orders(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplierId);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchaseOrderId TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  materialId TEXT NOT NULL REFERENCES materials(id),
  quantityOrdered double precision NOT NULL,
  quantityReceived double precision DEFAULT 0,
  unitCost double precision,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_poi_order ON purchase_order_items(purchaseOrderId);

-- ── Quotations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplierId TEXT NOT NULL REFERENCES vendors(id),
  materialDescription TEXT NOT NULL,
  quotedPrice double precision NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  quantity double precision,
  validUntil date,
  notes TEXT,
  status quotation_status NOT NULL DEFAULT 'PENDING',
  createdById TEXT NOT NULL REFERENCES users(id),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier ON quotations(supplierId);
