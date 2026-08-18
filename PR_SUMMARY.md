PR Summary: Remove Prisma runtime and migrate to Supabase

Overview
- Removed runtime usage of Prisma across server routes and replaced with Supabase admin queries (`supabaseAdmin`).
- Rewrote seed script to use Supabase service-role key (`prisma/seed.ts` -> Supabase-based seed).
- Removed `package-lock.json` to clear leftover `@prisma/client` references (regenerate after review if desired).
- Fixed TypeScript issues introduced during migration (enum typing relaxations where appropriate, null-safety, UI fragment fixes).

Files changed (high-level)
- src/app/api/tasks/** (many files) — migrated CRUD, events, photos, comments, distributions, reassign logic to Supabase
- src/app/api/vendors/**, src/app/api/vendor-materials/route.ts — migrated vendors and vendor-materials
- src/app/api/materials/** — migrated materials endpoints
- src/app/api/employees/[id]/route.ts — migrated employee detail and assigned tasks
- src/app/dashboard/page.tsx — migrated data fetching to Supabase and fixed null-safety
- src/lib/taskEvents.ts, src/lib/orgAudit.ts, src/lib/permissions.ts — adjusted types to allow migration
- src/lib/supabase.ts — (existing) central Supabase client
- prisma/seed.ts — rewritten to use Supabase
- package.json — fixed JSON formatting
- package-lock.json — removed

Testing performed
- Installed dependencies: `npm install`
- TypeScript check: `npx tsc --noEmit` — passed locally after fixes
- Started Next dev server (see terminal) — started but may require runtime env vars for full functionality

How to run locally (recommended)
1) Create a `.env.local` with these variables (example):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # for server-side admin operations and for running the seed
NEXTAUTH_SECRET=some-secret
```

2) Install deps and start dev server

```bash
npm install
npm run dev
```

3) To apply seed data (uses service role key)

```bash
npm run seed
```

Notes & follow-ups
- I relaxed a few TypeScript enum types to accept string during migration to avoid bulky enum imports; these can be tightened once we finalize `src/types/dbEnums.ts` as the single source of truth.
- Performance: several routes currently perform multiple sequential Supabase queries (N+1). Consider adding DB views or Postgres functions (RLS-aware) or using Supabase RPCs for heavy joins (dashboard, tasks enrichment).
- CI: update any CI scripts that referenced Prisma (migrations, seeds). Decide on a canonical DB migration strategy (Supabase migrations or SQL files under `database/`).

If you'd like, I can:
- Create a Git branch + open a PR (I can prepare a commit message and diff file), or
- Tighten enum typing now, or
- Convert frequent N+1 endpoints into single SQL view/RPC functions.

