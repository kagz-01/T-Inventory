# Touchline Inventory — Remaining Tasks

> These are polish/nice-to-have items. Core functionality is complete.
> Run `database/schema.sql` in Supabase SQL Editor before testing.

---

## 1. Profit/Cost Report

**Page:** `/reports/profit`  
**API:** Add `type=profit` case to `/api/reports`

Calculate:
- Total revenue from `customer_orders.quotedAmount`
- Total cost from `purchase_orders.totalEstimate` + material `costPerUnit * quantityUsed`
- Gross margin per order
- Monthly P&L summary

Add to sidebar nav under Reports.

---

## 2. Dashboard Quick Actions

**File:** `src/app/dashboard/page.tsx` (admin section)

Add action buttons to the hero banner or a quick-actions card:
- `+ New Order` → `/orders` (create modal)
- `+ New PO` → `/suppliers/purchase-orders` (create modal)
- `+ Add Material` → `/materials` (create modal)
- `+ Create Job` → `/production` (create modal)

These should be link buttons, not modals — just fast navigation to the create flow.

---

## 3. Dashboard Widgets (Admin)

**File:** `src/app/dashboard/page.tsx`

### 3.1 Orders Pipeline Widget
Show order status breakdown (Enquiry, Quote Sent, In Production, Ready, Completed) as mini status cards or a horizontal bar.

### 3.2 Recent Orders Widget
Last 5 customer orders with status badges. Pull from existing `customer_orders` query.

### 3.3 Who's Online Widget
Show team members who clocked in today (from `attendance` table, date = today, clockIn IS NOT NULL, clockOut IS NULL).

### 3.4 Production Overview Widget
Jobs in progress, completed this week, on hold.

---

## 4. Activity Auto-Generation

Currently activity events are created manually in each API route. Add a utility function and call it from relevant endpoints:

**File:** `src/lib/activity.ts` (create)

```typescript
export async function logActivity(params: {
  organizationId: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}) { ... }
```

Call from:
- `/api/orders` — ORDER_CREATED, ORDER_STATUS_CHANGED
- `/api/production` — JOB_CREATED, JOB_STATUS_CHANGED
- `/api/suppliers/purchase-orders` — PO_CREATED, PO_STATUS_CHANGED
- `/api/materials/[id]/movements` — STOCK_RECEIVED, STOCK_ISSUED
- `/api/attendance/[id]/clock-in` — CLOCKED_IN
- `/api/attendance/[id]/clock-out` — CLOCKED_OUT

---

## 5. Production Steps (Optional)

**Table:** `production_steps` (add to schema.sql)

```sql
CREATE TABLE IF NOT EXISTS production_steps (
  id TEXT PRIMARY KEY,
  productionJobId TEXT NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
  assignedToId TEXT REFERENCES users(id),
  completedAt TIMESTAMPTZ,
  sort_order INT DEFAULT 0
);
```

**API:** `/api/production/[id]/steps` — GET, POST, PATCH  
**UI:** Show steps on `/production/[id]` detail page as a checklist

Only needed for complex multi-step jobs (e.g., "Cut acrylic" → "Print vinyl" → "Assemble" → "Install").

---

## 6. CSV Export on Reports

**Files:** All report pages under `src/app/reports/`

Add an "Export CSV" button that:
1. Takes the current data (already fetched)
2. Converts to CSV format
3. Downloads as `.csv` file

Utility function:
```typescript
function exportToCSV(data: Record<string, any>[], filename: string) {
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
}
```

---

## Priority Order

1. **Dashboard quick actions** — fast win, improves daily UX
2. **Dashboard widgets** — makes admin dashboard feel complete
3. **Activity auto-generation** — ensures all actions are tracked
4. **Profit report** — most requested by boss
5. **CSV export** — useful for reporting
6. **Production steps** — only if jobs are complex enough

---

*Created: September 19, 2026*
