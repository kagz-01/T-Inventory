# Touchline Inventory (TI) — Gap Closure Plan

> **Business context:** Touchline is a signage & branding company.
> Materials include acrylic sheets, vinyl rolls, LED modules, aluminium composite panels, ink, mounting hardware, etc.
> "Production" means fabricating signs — cutting, printing, assembling, installing.
> "Orders" include both customer orders (signage jobs) and purchase orders (material sourcing from suppliers).

---

## 1. Inventory Module

**Current state:** Single `materials` table with name, category, stockOnHand, reorderThreshold, unit.

**Target:** Full inventory management with stock movement tracking.

### 1.1 Expand Material Categories

| Category | Examples |
|---|---|
| Raw Materials | Acrylic sheets, vinyl rolls, aluminium composite, PVC foam board |
| Consumables | Ink cartridges, cleaning solvents, adhesive tapes |
| Hardware | Screws, bolts, mounting brackets, clips, standoffs |
| Lighting | LED modules, power supplies, LED strips, diffusers |
| Packaging | Cardboard, bubble wrap, stretch film |
| Finished Goods | Completed signs ready for delivery |

### 1.2 Stock Movement Log

Create `stock_movements` table:

```sql
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  materialId TEXT NOT NULL REFERENCES materials(id),
  type TEXT NOT NULL CHECK (type IN ('RECEIVED','ISSUED','ADJUSTED','RETURNED','SCRAPPED')),
  quantity NUMERIC NOT NULL,
  referenceType TEXT, -- 'PURCHASE_ORDER', 'TASK', 'MANUAL', 'PRODUCTION_JOB'
  referenceId TEXT,   -- ID of the PO, task, or job
  notes TEXT,
  actorId TEXT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Material Batches / expiry

Optional but useful — track supplier, PO reference, cost per unit, and date received per batch so the boss knows "I paid KES 450/sheet for this acrylic from SignWorld on April 10."

```sql
ALTER TABLE materials ADD COLUMN IF NOT EXISTS costPerUnit NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplierId TEXT REFERENCES vendors(id);
```

### 1.4 UI

- `/materials` → list with filters (category, low stock, supplier)
- `/materials/[id]` → detail card with stock movement history, charts
- Quick actions: + Receive Stock, - Issue to Job, Adjust Count

---

## 2. Suppliers Module (rename from Vendors)

**Current state:** Basic CRUD on `vendors` table.

**Target:** Supplier directory + purchase tracking + performance.

### 2.1 Rename `vendors` → `suppliers` (or keep table, rename UI)

### 2.2 Purchase Orders

Create `purchase_orders` table:

```sql
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  supplierId TEXT NOT NULL REFERENCES vendors(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','PARTIAL','RECEIVED','CANCELLED')),
  totalEstimate NUMERIC,
  notes TEXT,
  createdBy TEXT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY,
  purchaseOrderId TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  materialId TEXT NOT NULL REFERENCES materials(id),
  quantityOrdered NUMERIC NOT NULL,
  quantityReceived NUMERIC DEFAULT 0,
  unitCost NUMERIC,
  notes TEXT
);
```

### 2.3 Quotations

Create `quotations` table (incoming supplier quotes):

```sql
CREATE TABLE quotations (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  supplierId TEXT NOT NULL REFERENCES vendors(id),
  materialDescription TEXT NOT NULL,
  quotedPrice NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES',
  validUntil DATE,
  notes TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','EXPIRED')),
  createdBy TEXT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 Supplier Performance

Tracked automatically from PO data:
- **On-time delivery rate** — % of POs received on/before expected date
- **Fill rate** — % of ordered quantity actually received
- **Quality issues** — count of items returned/scrapped after receipt

### 2.5 UI

- `/suppliers` → directory with contact info, performance scorecard
- `/suppliers/[id]` → supplier profile: POs, quotations, performance metrics
- `/suppliers/purchase-orders` → list of all POs with status filters
- `/suppliers/purchase-orders/new` → create PO (select supplier, add line items)
- `/suppliers/quotations` → incoming quotes to review

---

## 3. Orders Module (Customer Orders / Jobs)

**Current state:** `sourcing_tasks` handles task management but not customer order tracking.

**Target:** Track customer jobs from enquiry → quote → approved → in production → completed → delivered.

### 3.1 Customer Orders (Jobs)

```sql
CREATE TABLE customer_orders (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  orderNumber SERIAL, -- auto-incrementing per org: TL-001, TL-002...
  customerName TEXT NOT NULL,
  customerContact TEXT, -- phone/email
  description TEXT NOT NULL, -- e.g. "Reception signboard - 3m x 1m acrylic"
  orderType TEXT NOT NULL CHECK (orderType IN ('SIGNAGE','BRANDING','MIXED')),
  status TEXT NOT NULL DEFAULT 'ENQUIRY' CHECK (status IN (
    'ENQUIRY','QUOTE_SENT','QUOTE_ACCEPTED','IN_PRODUCTION',
    'QUALITY_CHECK','READY','DELIVERED','INSTALLED','COMPLETED','CANCELLED'
  )),
  quotedAmount NUMERIC,
  paidAmount NUMERIC DEFAULT 0,
  dueDate DATE,
  deliveryAddress TEXT,
  notes TEXT,
  createdBy TEXT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Order Line Items

```sql
CREATE TABLE customer_order_items (
  id TEXT PRIMARY KEY,
  customerOrderId TEXT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL, -- "3mm clear acrylic letters - T TOUCHLINE"
  quantity NUMERIC NOT NULL DEFAULT 1,
  unitPrice NUMERIC,
  notes TEXT
);
```

### 3.3 Link Tasks to Orders

```sql
ALTER TABLE sourcing_tasks ADD COLUMN IF NOT EXISTS customerOrderId TEXT REFERENCES customer_orders(id);
```

This lets you see "all tasks for Job #TL-0042" and link material sourcing directly to a customer job.

### 3.4 Status Flow

```
ENQUIRY → QUOTE_SENT → QUOTE_ACCEPTED → IN_PRODUCTION → QUALITY_CHECK → READY → DELIVERED → INSTALLED → COMPLETED
                                      ↘ CANCELLED
```

### 3.5 UI

- `/orders` → Kanban board or list view with status columns
- `/orders/[id]` → Order detail: customer info, items, linked tasks, payment status, timeline
- `/orders/new` → Create order form
- Dashboard widget: "Orders in Pipeline" status breakdown

---

## 4. Production Module

**Current state:** None.

**Target:** Track fabrication/installation jobs, link to materials used and orders.

### 4.1 Production Jobs

```sql
CREATE TABLE production_jobs (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  customerOrderId TEXT REFERENCES customer_orders(id),
  title TEXT NOT NULL, -- "Cut & paint reception letters"
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
    'QUEUED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED'
  )),
  assignedToId TEXT REFERENCES users(id),
  estimatedHours NUMERIC,
  actualHours NUMERIC,
  startDate DATE,
  dueDate DATE,
  completedAt TIMESTAMPTZ,
  notes TEXT,
  createdBy TEXT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Materials Used (per job)

```sql
CREATE TABLE production_materials (
  id TEXT PRIMARY KEY,
  productionJobId TEXT NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
  materialId TEXT NOT NULL REFERENCES materials(id),
  quantityUsed NUMERIC NOT NULL,
  issuedBy TEXT REFERENCES users(id),
  issuedAt TIMESTAMPTZ DEFAULT now()
);
```

When materials are issued to a job:
1. Insert into `production_materials`
2. Insert into `stock_movements` with type='ISSUED', referenceType='PRODUCTION_JOB'
3. Decrement `stockOnHand` on the material

### 4.3 Production Steps (optional — for complex jobs)

```sql
CREATE TABLE production_steps (
  id TEXT PRIMARY KEY,
  productionJobId TEXT NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Cut acrylic", "Print vinyl wrap", "Assemble frame", "Install"
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
  assignedToId TEXT REFERENCES users(id),
  completedAt TIMESTAMPTZ,
  sort_order INT DEFAULT 0
);
```

### 4.4 UI

- `/production` → Kanban: Queued → In Progress → Completed
- `/production/[id]` → Job card: linked order, assigned team, materials used, steps, time tracking
- Dashboard widget: "Jobs in Progress" with进度

---

## 5. Employees Module (expand)

**Current state:** User management (invite, role, activate/deactivate).

**Target:** Add attendance, activity tracking, performance metrics.

### 5.1 Attendance

```sql
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  userId TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  clockIn TIMESTAMPTZ,
  clockOut TIMESTAMPTZ,
  status TEXT DEFAULT 'ABSENT' CHECK (status IN ('PRESENT','ABSENT','HALF_DAY','LEAVE')),
  notes TEXT,
  UNIQUE(organizationId, userId, date)
);
```

### 5.2 Activity Log

Already partially done via `task_events`. Extend to capture:

```sql
-- Add to stock_movements: actorId already tracks who
-- Add to production_jobs: assignedTo + completedAt tracks work
-- Create a unified activity view:
CREATE VIEW employee_activity AS
SELECT
  'TASK' as activity_type,
  te.actorId as userId,
  te.organizationId,
  te.createdAt,
  te.type as action,
  st.title as detail
FROM task_events te
JOIN sourcing_tasks st ON st.id = te.taskId
UNION ALL
SELECT
  'STOCK' as activity_type,
  sm.actorId as userId,
  sm.organizationId,
  sm.createdAt,
  sm.type as action,
  m.name as detail
FROM stock_movements sm
JOIN materials m ON m.id = sm.materialId
UNION ALL
SELECT
  'PRODUCTION' as activity_type,
  pj.assignedToId as userId,
  pj.organizationId,
  pj.updatedAt as createdAt,
  pj.status as action,
  pj.title as detail
FROM production_jobs pj
WHERE pj.assignedToId IS NOT NULL;
```

### 5.3 Performance Metrics

Computed from activity data:
- **Tasks completed this week/month** — count of SOURCED/DISTRIBUTED tasks
- **Avg task completion time** — time from assignment to completion
- **Materials handled** — total issuances/receipts
- **Jobs contributed to** — production jobs participated in
- **Attendance rate** — days present / working days

### 5.4 UI

- `/employees` → team list with performance cards
- `/employees/[id]` → profile: attendance calendar, activity timeline, performance stats
- `/employees/attendance` → attendance overview (admin/manager view)

---

## 6. Reports Module

**Current state:** None.

**Target:** Operational and financial reports.

### 6.1 Report Types

| Report | Data Source | Key Metrics |
|---|---|---|
| **Inventory Summary** | materials, stock_movements | Total items, value, low stock count, turnover rate |
| **Purchase Report** | purchase_orders, purchase_order_items | Total spend, top suppliers, pending orders |
| **Sales/Revenue** | customer_orders | Revenue by month, by order type (signage vs branding), outstanding payments |
| **Production Report** | production_jobs, production_materials | Jobs completed, avg completion time, material waste |
| **Employee Activity** | employee_activity view, attendance | Tasks per person, attendance rate, productivity |
| **Profit/Cost** | customer_orders (revenue) vs purchase_orders + materials (cost) | Gross margin per job, cost breakdown |

### 6.2 Implementation

Create a `/reports` page with:
- Date range picker
- Report type selector
- Data table + charts (use existing DashboardCharts pattern)
- Export to CSV

### 6.3 UI

- `/reports` → report selector dashboard
- `/reports/inventory` → inventory analytics
- `/reports/purchases` → supplier spend analysis
- `/reports/sales` → revenue and order pipeline
- `/reports/production` → job completion and efficiency
- `/reports/employees` → team productivity
- `/reports/profit` → P&L overview

---

## 7. Activity Trail (Full Audit)

**Current state:** `task_events` and `org_audit_logs` exist but are siloed.

**Target:** Unified activity trail visible on dashboard and per-entity.

### 7.1 Unified Events Table

```sql
CREATE TABLE activity_events (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id),
  actorId TEXT NOT NULL REFERENCES users(id),
  eventType TEXT NOT NULL, -- INVENTORY_RECEIVED, ORDER_CREATED, JOB_COMPLETED, etc.
  entityType TEXT NOT NULL, -- 'MATERIAL', 'ORDER', 'JOB', 'SUPPLIER', 'EMPLOYEE'
  entityId TEXT NOT NULL,
  metadata JSONB, -- flexible payload: { quantity: 20, supplier: "SignWorld", ... }
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_org_date ON activity_events(organizationId, createdAt DESC);
```

### 7.2 Auto-generation

Each significant action inserts an activity event:
- Material received/issued → `INVENTORY_RECEIVED` / `INVENTORY_ISSUED`
- PO created/received → `PO_CREATED` / `PO_RECEIVED`
- Order status changed → `ORDER_STATUS_CHANGED`
- Job completed → `JOB_COMPLETED`
- Task assigned/completed → `TASK_ASSIGNED` / `TASK_COMPLETED`
- Team member invited/deactivated → `TEAM_INVITED` / `TEAM_DEACTIVATED`

### 7.3 Dashboard Integration

The "Recent Activity" section on all dashboards pulls from `activity_events` instead of just `task_events`.

---

## 8. Dashboard Enhancements

**Current state:** Role-based dashboards with KPIs, charts, task pipeline.

**Target:** Add widgets for new modules.

### 8.1 Admin Dashboard Additions

- **Orders Pipeline** — status breakdown (Enquiry → Quote → Production → Delivered)
- **Production Overview** — jobs in progress, completed this week, on hold
- **Recent Orders** — last 5 customer orders with status
- **Supplier Activity** — pending POs, recent deliveries
- **Quick Actions** — + New Order, + New PO, + Add Material, + Create Job
- **Revenue This Month** — from customer_orders.paidAmount

### 8.2 Manager Dashboard Additions

- **My Team's Jobs** — production jobs assigned to team
- **Orders Awaiting Quote** — orders stuck at ENQUIRY/QUOTE_SENT

### 8.3 Employee Dashboard

- **My Jobs** — production jobs assigned to me
- **Clock In/Out** — attendance widget

---

## 9. Navigation Update

**Current sidebar:**
```
Dashboard, Tasks, Projects, Leads, Materials, Vendors, Team, Settings
```

**New sidebar:**
```
Dashboard
Orders (customer jobs)
Production (fabrication jobs)
Materials (inventory + stock movements)
Suppliers (directory + POs + quotations)
Tasks (sourcing/internal tasks)
Team (employees + attendance)
Reports
Settings
```

Remove: Projects, Leads (or fold Leads into Orders as the ENQUIRY stage).

---

## 10. Implementation Order

Phase 1 — **Foundation** (do first, everything depends on it):
1. Expand `materials` table (categories, costPerUnit, supplierId)
2. Create `stock_movements` table + API + UI
3. Rename sidebar: Vendors → Suppliers

Phase 2 — **Orders & Production** (core business flow):
4. Create `customer_orders` + `customer_order_items` tables + API + UI
5. Create `production_jobs` + `production_materials` tables + API + UI
6. Link tasks to orders (add customerOrderId to sourcing_tasks)

Phase 3 — **Supplier Depth**:
7. Create `purchase_orders` + `purchase_order_items` tables + API + UI
8. Create `quotations` table + API + UI
9. Supplier performance dashboard

Phase 4 — **People & Activity**:
10. Create `attendance` table + clock-in/out UI
11. Create `activity_events` table + auto-generation triggers
12. Extend dashboard "Recent Activity" to use unified feed

Phase 5 — **Reports & Polish**:
13. Build report pages (inventory, purchases, sales, production, employees, profit)
14. Dashboard quick actions and new widgets
15. Update navigation to final structure

---

## 11. Database Migration Strategy

Since Supabase is used as a data store (no Prisma/Drizzle), all migrations are raw SQL:

1. Create new tables via Supabase SQL editor or migration scripts
2. Add columns to existing tables with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
3. Backfill data where needed (e.g., categorize existing materials)
4. Keep backward compatibility — don't drop columns until new UI is live

Migration files go in `database/migrations/`:
```
database/migrations/
  001_expand_materials.sql
  002_stock_movements.sql
  003_customer_orders.sql
  004_production_jobs.sql
  005_purchase_orders.sql
  006_quotations.sql
  007_attendance.sql
  008_activity_events.sql
```

---

## 12. API Route Structure

```
/api/materials                  GET (list) | POST (create)
/api/materials/[id]             GET | PATCH | DELETE
/api/materials/[id]/movements   GET (history) | POST (new movement)

/api/orders                     GET | POST
/api/orders/[id]                GET | PATCH | DELETE
/api/orders/[id]/items          GET | POST
/api/orders/[id]/tasks          GET (linked tasks)

/api/production                 GET | POST
/api/production/[id]            GET | PATCH | DELETE
/api/production/[id]/materials  GET | POST (issue materials)

/api/suppliers                  GET | POST
/api/suppliers/[id]             GET | PATCH | DELETE
/api/suppliers/[id]/performance GET
/api/suppliers/purchase-orders  GET | POST
/api/suppliers/po/[id]          GET | PATCH
/api/suppliers/quotations       GET | POST
/api/suppliers/quotations/[id]  GET | PATCH

/api/employees/[id]/attendance  GET | POST
/api/employees/[id]/activity    GET
/api/employees/[id]/performance GET

/api/reports/[type]             GET (type = inventory|purchases|sales|production|employees|profit)

/api/activity                   GET (unified feed)
```

---

## 13. Key Decisions to Make

| Decision | Options | Recommendation |
|---|---|---|
| Rename "Vendors" to "Suppliers"? | Keep name / Rename | Rename UI only, keep table name `vendors` to avoid migration pain |
| Keep "Projects" nav item? | Remove / Merge into Orders | Merge — a customer order IS the project |
| Keep "Leads" nav item? | Remove / Merge into Orders | Merge — leads become the ENQUIRY status of an order |
| Attendance model | Clock in/out / Daily check-in / Auto from login | Clock in/out (manual, simple) |
| Production steps | Mandatory / Optional per job | Optional — complex jobs use steps, simple jobs don't |
| Report export | CSV only / CSV + PDF | CSV first, PDF later |
| Currency | KES only / Multi-currency | KES only for now (per .env.example) |

---

*Last updated: September 19, 2026*
