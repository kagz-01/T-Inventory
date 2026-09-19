-- =============================================================================
-- Phase 1: Expand materials + Stock Movements
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- ── Expand materials table ──────────────────────────────────────────────────

ALTER TABLE materials ADD COLUMN IF NOT EXISTS costPerUnit double precision;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplierId text REFERENCES vendors(id);

-- ── Stock Movements ─────────────────────────────────────────────────────────

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
