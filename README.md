# Signage & Branding Materials Sourcing / Inventory Platform

Admin-driven web + mobile (PWA) platform to manage material sourcing for signage/branding work:
materials catalogue, vendor directory with pricing, a sourcing task board with employee
assignment/reassignment (handoff), photo/mockup uploads, and a dashboard with low-stock and
stalled-task alerts.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · Supabase (Postgres + Storage) ·
NextAuth (Google OAuth) · Tailwind CSS · PWA (installable on mobile)

---

## 1. Prerequisites

- Node.js 18.18+ (20 LTS recommended)
- A [Supabase](https://supabase.com) project (free tier is fine to start)
- A [Google Cloud](https://console.cloud.google.com/apis/credentials) OAuth client

## 2. Install dependencies

```bash
npm install
```

## 3. Set up Supabase

1. Create a project at supabase.com.
2. Go to **Project Settings → Database → Connection string**.
   - Copy the **Connection pooling** string (port 6543) → this is `DATABASE_URL`.
   - Copy the **Direct connection** string (port 5432) → this is `DIRECT_URL`
     (Prisma migrations need the direct, non-pooled connection).
3. Go to **Project Settings → API**.
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-side only)
4. Go to **Storage** and create a new bucket named exactly `materials-photos`.
   - Make it **public** (simplest for now — photos are viewed by logged-in staff only via app
     links, but the bucket itself is public-read so `getPublicUrl` works without extra signing).
   - Add an upload policy allowing authenticated inserts (or public inserts if you prefer to
     keep it simple initially — tighten later).

## 4. Set up Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add authorized redirect URI:
   - Local dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
4. Copy the Client ID and Client Secret into your `.env`.

## 5. Configure environment variables

```bash
cp .env.example .env
```

Fill in every value in `.env`. Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Set `ADMIN_BOOTSTRAP_EMAIL` to **your** Google account email — the first time you sign in with
that email, you're automatically promoted to `ADMIN`. Everyone else who signs in defaults to
`EMPLOYEE`; promote managers/admins afterward from the Employees page (as Admin).

## 6. Push the database schema

```bash
npx prisma generate
npx prisma migrate dev --name init
```

This creates all tables in your Supabase Postgres database.

### Optional: seed sample data

```bash
npm run seed
```

This adds a couple of sample materials, vendors, and one task so you have something to look at
immediately. It creates placeholder users (`boss@example.com` etc.) that are **not** linked to
real Google accounts — real accounts get created automatically the first time each person signs
in with Google. Feel free to skip this and start from a clean slate.

## 7. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with Google, and you're in.

## 8. Deploying to production

- **Recommended:** [Vercel](https://vercel.com) — connect your GitHub repo, add all the same
  env vars in the Vercel dashboard, deploy. Update `NEXTAUTH_URL` and the Google OAuth redirect
  URI to your production domain.
- Run `npx prisma migrate deploy` (instead of `migrate dev`) against production when you ship
  schema changes.
- Because the app is a PWA, once deployed, employees can open it on their phone and tap
  "Add to Home Screen" — it behaves like an installed app, no app store needed.

---

## Project structure

```
prisma/schema.prisma        Full data model — Organization, Invite, OrgAuditLog, Materials,
                             Vendors, Tasks, Users, Projects, etc. Every business record is
                             scoped to an organizationId.
prisma/seed.ts               Sample data script (creates Organization #1 + sample data)
src/lib/auth.ts              NextAuth config — Google provider, org bootstrap for the first
                              admin, invite consumption for everyone else
src/lib/permissions.ts       Role + org-scoping permission helpers (requireOrgUser, etc.)
src/lib/orgAudit.ts          Org-level audit log writer (invites, role changes, deactivation)
src/lib/taskEvents.ts        Central audit-log writer for every task action
src/lib/uploadPhoto.ts       Client-side Supabase Storage upload helper
src/lib/validation.ts        Zod schemas for all API input
src/app/api/...              REST API routes — every route filters by the caller's organizationId
src/app/api/invites          Invite CRUD (send/resend/revoke) + public token lookup
src/app/api/organization      Org profile GET/PATCH
src/app/invite/[token]        Public invite landing page (shown before Google sign-in)
src/app/settings             Team & Settings — invites, member roles, org profile (Admin/Manager)
src/app/dashboard            Role-differentiated: Admin/Manager see org-wide alerts + activity;
                              Employee sees "My Tasks" front and center
src/app/tasks                Task board (by status) + task detail (status pipeline, reassign)
src/app/materials            Materials catalogue
src/app/vendors              Vendor directory
src/app/employees            Employee workload view + role management (Admin)
src/app/leads                Public-site enquiries (from touchline-platform) → Convert to Task
```

## Connection to the public Touchline website

The `Lead` model in `prisma/schema.prisma` is mapped (via `@@map("leads")`)
to a table created and written to by a **separate** codebase —
`touchline-platform`, the public marketing site for Touchline Branding and
Touchline Signage. Both apps must point at the same Supabase project for
this to work; see that repo's `TOUCHLINE_INTEGRATION.md` for the full
picture. This app only reads and updates `Lead` rows (status changes,
linking a converted task) — it never creates them.

The **Leads** page (Admin/Manager only) lists incoming enquiries and lets
you convert one into a real `SourcingTask` in one step, carrying the
original contact details over as a task comment so nothing from the public
enquiry is lost.

## Access model (invite-only, multi-tenant-ready)

The app has no public signup. Every sign-in is one of:

1. **Org bootstrap** — the very first sign-in, matching `ADMIN_BOOTSTRAP_EMAIL`, when no
   Organization exists yet. This creates Organization #1 and makes that person `ADMIN`.
2. **Invite acceptance** — Admin/Manager sends an invite from **Team & Settings**
   (`/settings`) with an email + role. The invitee opens the link at `/invite/:token`,
   signs in with the *same* Google email, and is auto-joined to the org with the
   pre-set role. Invites expire after 7 days and can be resent or revoked.
3. **Returning member** — any email that already has a User row signs straight back in,
   unless an Admin has deactivated them (which also immediately kills their active
   sessions — see `src/app/api/employees/[id]/route.ts`).

Anyone else is bounced to `/login?error=AccessDenied` with a friendly "you haven't been
invited" message — no silent account creation.

Every Material, Vendor, Project, and SourcingTask carries an `organizationId`, and every API
route filters by the signed-in user's org. Today that means one company (yours); the schema
and route-level scoping already support onboarding a second organization later without a
rewrite — an org switcher and per-org billing are the only pieces intentionally left out for now.

## Core workflow reference

**Task status pipeline:**
`PENDING → ASSIGNED → SEARCHING → FOUND → SAMPLE_COLLECTED → AWAITING_APPROVAL → PURCHASED →
BRANDING_IN_PROGRESS → BRANDING_COMPLETE → DISTRIBUTED`
(or `UNAVAILABLE` at any point during sourcing, which returns to `PENDING` for reassignment)

This reflects the actual business flow: source the raw/blank product (tote bags, caps, wallets,
etc. from a promo shop) → purchase it → send it to a branding partner to apply the client's logo
(screen print, embroidery, heat transfer, engraving...) → once branding is done and checked, hand
it over to the client/tender recipient(s).

**Vendors are typed** (`SOURCING`, `BRANDING`, or `BOTH`) so the same directory serves both
stages - when a task reaches the branding step, only branding-capable vendors show up in the
dropdown.

**Distribution is tracked per hand-over**, not as a single checkbox - a 200-unit tender item can
be split across several recipients, each recorded with quantity, recipient, date, and notes. The
task only flips to `DISTRIBUTED` once the total handed over reaches the quantity needed.

**Reassignment / handoff:** `POST /api/tasks/:id/reassign` — moves a task to a new employee,
sets status to `REASSIGNED`, and logs the handoff in the task's event timeline. All prior
photos, vendor info, prices, and comments stay attached to the task, so the new assignee sees
everything already gathered.

**Roles:**
- `ADMIN` (boss) — full access, manages catalogue/vendors, changes employee roles, deletes tasks
- `MANAGER` — can manage catalogue/vendors, assign/reassign tasks, approve purchases
- `EMPLOYEE` — sees and updates only their own assigned tasks, can hand off their own tasks

## What's scaffolded vs. what to build next

**Working now:** full data model with an Organization boundary on every business record,
invite-only auth (org bootstrap + email invites, with deactivation killing sessions
immediately), role-differentiated dashboard, Team & Settings page (send/resend/revoke
invites, change roles, deactivate/reactivate members, edit org name), org-level audit log,
all core CRUD APIs (org-scoped), task board, task detail with status updates + reassignment +
photo upload + timeline + comments, materials & vendor directories, employee workload view.

**Good next additions:**
- Project detail/board pages (API already exists: `GET/PATCH /api/projects/:id`)
- Price comparison UI on the material detail view (API already exists: `GET /api/vendor-materials?materialId=`)
- Exportable PDF/Excel reports
- In-app notification bell (new task, reassignment, low stock, stalled task, invite accepted)
  + push notifications (Firebase Cloud Messaging)
- Search/filter UI on Materials, Vendors, Tasks pages (API already supports query params)
- Org logo upload, default currency/units in Settings
- Org switcher in the nav + org-slug URLs — the schema already supports a second
  organization; this is purely a UI/UX addition
- Tightening Supabase Storage bucket policies for production
