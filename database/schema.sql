-- =============================================================================
-- Touchline Inventory — Database Schema
-- Safe to run on shared Supabase (uses IF NOT EXISTS, no DROP statements)
-- Run this in the Supabase SQL Editor.
-- Safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
        CREATE TYPE invite_status AS ENUM ('PENDING','ACCEPTED','EXPIRED','REVOKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_audit_event_type') THEN
        CREATE TYPE org_audit_event_type AS ENUM (
            'INVITE_SENT','INVITE_RESENT','INVITE_REVOKED','INVITE_ACCEPTED',
            'ROLE_CHANGED','MEMBER_DEACTIVATED','MEMBER_REACTIVATED','ORG_UPDATED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
        CREATE TYPE role AS ENUM ('ADMIN','MANAGER','EMPLOYEE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM (
            'PENDING','ASSIGNED','SEARCHING','REASSIGNED','FOUND','SAMPLE_COLLECTED',
            'AWAITING_APPROVAL','PURCHASED','BRANDING_IN_PROGRESS','BRANDING_COMPLETE','DISTRIBUTED','UNAVAILABLE'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_type') THEN
        CREATE TYPE vendor_type AS ENUM ('SOURCING','BRANDING','BOTH');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('LOW','NORMAL','HIGH','URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_kind') THEN
        CREATE TYPE photo_kind AS ENUM ('SAMPLE','ARTWORK','BRANDED_PROOF','DELIVERY_PROOF');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_event_type') THEN
        CREATE TYPE task_event_type AS ENUM (
            'CREATED','ASSIGNED','REASSIGNED','STATUS_CHANGED','PHOTO_ADDED','VENDOR_LINKED',
            'BRANDING_VENDOR_LINKED','ARTWORK_UPLOADED','DISTRIBUTION_RECORDED','COMMENT_ADDED'
        );
    END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logoUrl TEXT,
  contactEmail TEXT,
  contactPhone TEXT,
  currency TEXT NOT NULL DEFAULT 'KES',
  plan TEXT NOT NULL DEFAULT 'FREE',
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  emailVerified timestamptz,
  image TEXT,
  phone TEXT,
  passwordHash TEXT,
  role role NOT NULL DEFAULT 'EMPLOYEE',
  active boolean NOT NULL DEFAULT true,
  createdAt timestamptz NOT NULL DEFAULT now(),
  organizationId TEXT,
  CONSTRAINT fk_users_organization FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organizationId);

-- ─────────────────────────────────────────────────────────────────────────────
-- NEXTAUTH TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at integer,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  CONSTRAINT accounts_user_fk FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_accounts_provider_account ON accounts(provider, providerAccountId);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  expires timestamptz NOT NULL,
  CONSTRAINT sessions_user_fk FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY(identifier, token)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INVITES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role role NOT NULL DEFAULT 'EMPLOYEE',
  token TEXT UNIQUE NOT NULL,
  status invite_status NOT NULL DEFAULT 'PENDING',
  expiresAt timestamptz NOT NULL,
  acceptedAt timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  organizationId TEXT NOT NULL,
  invitedById TEXT NOT NULL,
  CONSTRAINT invites_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT invites_inviter_fk FOREIGN KEY (invitedById) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_invites_organization ON invites(organizationId);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORG AUDIT LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_audit_logs (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  actorId TEXT,
  type org_audit_event_type NOT NULL,
  targetEmail TEXT,
  fromValue TEXT,
  toValue TEXT,
  note TEXT,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_audit_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_org_audit_org ON org_audit_logs(organizationId);

-- ─────────────────────────────────────────────────────────────────────────────
-- MATERIALS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  stockOnHand double precision NOT NULL DEFAULT 0,
  reorderThreshold double precision NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  organizationId TEXT NOT NULL,
  CONSTRAINT materials_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_org ON materials(organizationId);

-- ── Expanded materials columns (Phase 1) ───────────────────────────────────

DO $$ BEGIN
    ALTER TABLE materials ADD COLUMN IF NOT EXISTS costPerUnit double precision;
    ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplierId text REFERENCES vendors(id);
EXCEPTION WHEN duplicate_column THEN null;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- MATERIAL PHOTOS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS material_photos (
  id TEXT PRIMARY KEY,
  materialId TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_photos_material_fk FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDORS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type vendor_type NOT NULL DEFAULT 'SOURCING',
  address TEXT,
  contactName TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  rating integer,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  organizationId TEXT NOT NULL,
  CONSTRAINT vendors_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organizationId);

-- ─────────────────────────────────────────────────────────────────────────────
-- VENDOR-MATERIAL PRICING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_materials (
  id TEXT PRIMARY KEY,
  vendorId TEXT NOT NULL,
  materialId TEXT NOT NULL,
  price double precision NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  quantityAvail double precision,
  lastCheckedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vm_vendor_fk FOREIGN KEY (vendorId) REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT vm_material_fk FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_vendor_material ON vendor_materials(vendorId, materialId);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clientName TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdAt timestamptz NOT NULL DEFAULT now(),
  organizationId TEXT NOT NULL,
  CONSTRAINT projects_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organizationId);

-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING TASKS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sourcing_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  materialId TEXT NOT NULL,
  quantityNeeded double precision NOT NULL,
  status task_status NOT NULL DEFAULT 'PENDING',
  priority task_priority NOT NULL DEFAULT 'NORMAL',
  projectId TEXT,
  vendorId TEXT,
  quotedPrice double precision,
  brandingVendorId TEXT,
  brandingMethod TEXT,
  brandingCost double precision,
  artworkUrl TEXT,
  assignedToId TEXT,
  createdById TEXT NOT NULL,
  lastActivityAt timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  organizationId TEXT NOT NULL,
  CONSTRAINT st_material_fk FOREIGN KEY (materialId) REFERENCES materials(id),
  CONSTRAINT st_project_fk FOREIGN KEY (projectId) REFERENCES projects(id),
  CONSTRAINT st_vendor_fk FOREIGN KEY (vendorId) REFERENCES vendors(id),
  CONSTRAINT st_branding_vendor_fk FOREIGN KEY (brandingVendorId) REFERENCES vendors(id),
  CONSTRAINT st_assigned_fk FOREIGN KEY (assignedToId) REFERENCES users(id),
  CONSTRAINT st_createdby_fk FOREIGN KEY (createdById) REFERENCES users(id),
  CONSTRAINT st_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sourcing_tasks_status ON sourcing_tasks(status);
CREATE INDEX IF NOT EXISTS idx_sourcing_tasks_assigned ON sourcing_tasks(assignedToId);
CREATE INDEX IF NOT EXISTS idx_sourcing_tasks_org ON sourcing_tasks(organizationId);

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK PHOTOS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_photos (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  url TEXT NOT NULL,
  kind photo_kind NOT NULL DEFAULT 'SAMPLE',
  caption TEXT,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_photos_task_fk FOREIGN KEY (taskId) REFERENCES sourcing_tasks(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK EVENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  actorId TEXT NOT NULL,
  type task_event_type NOT NULL,
  fromValue TEXT,
  toValue TEXT,
  note TEXT,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_events_task_fk FOREIGN KEY (taskId) REFERENCES sourcing_tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_events_actor_fk FOREIGN KEY (actorId) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(taskId);

-- ─────────────────────────────────────────────────────────────────────────────
-- TASK COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_comments_task_fk FOREIGN KEY (taskId) REFERENCES sourcing_tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_comments_author_fk FOREIGN KEY (authorId) REFERENCES users(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DISTRIBUTION RECORDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS distribution_records (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  organizationId TEXT NOT NULL,
  recipientName TEXT NOT NULL,
  recipientContact TEXT,
  quantity double precision NOT NULL,
  deliveryDate timestamptz NOT NULL DEFAULT now(),
  deliveredById TEXT NOT NULL,
  proofPhotoUrl TEXT,
  notes TEXT,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dist_task_fk FOREIGN KEY (taskId) REFERENCES sourcing_tasks(id) ON DELETE CASCADE,
  CONSTRAINT dist_delivered_by_fk FOREIGN KEY (deliveredById) REFERENCES users(id),
  CONSTRAINT dist_org_fk FOREIGN KEY (organizationId) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_distribution_task ON distribution_records(taskId);
CREATE INDEX IF NOT EXISTS idx_distribution_org ON distribution_records(organizationId);

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER EXISTING LEADS TABLE (add organization_id for inventory platform)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_task_id TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at timestamptz;
EXCEPTION WHEN duplicate_column THEN null;
END$$;

CREATE INDEX IF NOT EXISTS idx_leads_organization ON public.leads(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DEFAULT ORGANIZATION
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, contactEmail, contactPhone, currency)
VALUES ('org_touchline', 'Touchline', 'info@touchlineltd.co.ke', '+254722668696', 'KES')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PHASE 1 — Stock Movements
-- =============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE stock_movement_type AS ENUM ('RECEIVED','ISSUED','ADJUSTED','RETURNED','SCRAPPED');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  materialId TEXT NOT NULL REFERENCES materials(id),
  type stock_movement_type NOT NULL,
  quantity double precision NOT NULL,
  referenceType TEXT,
  referenceId TEXT,
  notes TEXT,
  actorId TEXT NOT NULL REFERENCES users(id),
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(materialId);

-- ── Link tasks to orders ────────────────────────────────────────────────────

DO $$ BEGIN
    ALTER TABLE sourcing_tasks ADD COLUMN IF NOT EXISTS customerOrderId TEXT REFERENCES customer_orders(id);
EXCEPTION WHEN duplicate_column THEN null;
END$$;

CREATE INDEX IF NOT EXISTS idx_sourcing_tasks_order ON sourcing_tasks(customerOrderId);

-- =============================================================================
-- PHASE 2 — Customer Orders + Production Jobs
-- =============================================================================

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
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('QUEUED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED');
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

-- =============================================================================
-- PHASE 3 — Purchase Orders + Quotations
-- =============================================================================

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

-- =============================================================================
-- PHASE 4 — Attendance + Activity Events
-- =============================================================================

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id),
  date date NOT NULL,
  clockIn timestamptz,
  clockOut timestamptz,
  status TEXT NOT NULL DEFAULT 'ABSENT' CHECK (status IN ('PRESENT','ABSENT','HALF_DAY','LEAVE')),
  notes TEXT,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organizationId, userId, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON attendance(organizationId, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(userId, date DESC);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actorId TEXT NOT NULL REFERENCES users(id),
  eventType TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  metadata JSONB,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_org_date ON activity_events(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_events(entityType, entityId);

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Full schema with all phases (1-4).
-- ─────────────────────────────────────────────────────────────────────────────
