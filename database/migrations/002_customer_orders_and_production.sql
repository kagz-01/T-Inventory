-- =============================================================================
-- Phase 2: Customer Orders + Production Jobs
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- ── Customer Orders ─────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'ENQUIRY','QUOTE_SENT','QUOTE_ACCEPTED','IN_PRODUCTION',
            'QUALITY_CHECK','READY','DELIVERED','INSTALLED','COMPLETED','CANCELLED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
        CREATE TYPE order_type AS ENUM ('SIGNAGE','BRANDING','MIXED');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS customer_orders (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  orderNumber SERIAL,
  customerName TEXT NOT NULL,
  customerContact TEXT,
  description TEXT NOT NULL,
  orderType order_type NOT NULL DEFAULT 'SIGNAGE',
  status order_status NOT NULL DEFAULT 'ENQUIRY',
  quotedAmount double precision,
  paidAmount double precision DEFAULT 0,
  dueDate date,
  deliveryAddress TEXT,
  notes TEXT,
  createdById TEXT NOT NULL REFERENCES users(id),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_orders_org ON customer_orders(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);

CREATE TABLE IF NOT EXISTS customer_order_items (
  id TEXT PRIMARY KEY,
  customerOrderId TEXT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity double precision NOT NULL DEFAULT 1,
  unitPrice double precision,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_coi_order ON customer_order_items(customerOrderId);

-- ── Production Jobs ─────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('QUEUED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS production_jobs (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customerOrderId TEXT REFERENCES customer_orders(id),
  title TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'QUEUED',
  assignedToId TEXT REFERENCES users(id),
  estimatedHours double precision,
  actualHours double precision,
  startDate date,
  dueDate date,
  completedAt timestamptz,
  notes TEXT,
  createdById TEXT NOT NULL REFERENCES users(id),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_jobs_org ON production_jobs(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_production_jobs_status ON production_jobs(status);
CREATE INDEX IF NOT EXISTS idx_production_jobs_assigned ON production_jobs(assignedToId);

CREATE TABLE IF NOT EXISTS production_materials (
  id TEXT PRIMARY KEY,
  productionJobId TEXT NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
  materialId TEXT NOT NULL REFERENCES materials(id),
  quantityUsed double precision NOT NULL,
  issuedBy TEXT REFERENCES users(id),
  issuedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_materials_job ON production_materials(productionJobId);

-- ── Link tasks to orders ────────────────────────────────────────────────────

ALTER TABLE sourcing_tasks ADD COLUMN IF NOT EXISTS customerOrderId TEXT REFERENCES customer_orders(id);
CREATE INDEX IF NOT EXISTS idx_sourcing_tasks_order ON sourcing_tasks(customerOrderId);
