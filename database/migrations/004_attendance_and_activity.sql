-- =============================================================================
-- Phase 4: Attendance + Activity Events
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- ── Attendance ──────────────────────────────────────────────────────────────

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

-- ── Activity Events (unified feed) ─────────────────────────────────────────

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
