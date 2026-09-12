# Touchline Inventory Platform

Materials sourcing, branding tracking & distribution management for Touchline Branding & Touchline Signage.

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd T-Inventory
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required:
- **Supabase** — URL, anon key, service role key
- **Google OAuth** — Client ID + secret (for sign-in)
- **NEXTAUTH_SECRET** — Generate with `openssl rand -base64 32`
- **ADMIN_BOOTSTRAP_EMAIL** — Your email (first user becomes ADMIN)

### 3. Database

Run `database/schema.sql` in the Supabase SQL Editor to create all tables.

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production

### Vercel Deployment

1. Push to GitHub
2. Import into Vercel
3. Set domain: `app.touchlineltd.co.ke`
4. Add environment variables (same as `.env.local` but with production values)
5. Set `NEXTAUTH_URL=https://app.touchlineltd.co.ke`

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://app.touchlineltd.co.ke/api/auth/callback/google`
4. Copy Client ID + Secret to Vercel env vars

### DNS

Add to Cloudflare:
```
app.touchlineltd.co.ke  CNAME  cname.vercel-dns.com
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- NextAuth.js (Google OAuth + Email/Password)
- Recharts (dashboard charts)
- PWA (installable on mobile)

## Roles

| Role | Access |
|------|--------|
| ADMIN | Everything — team, tasks, materials, vendors, settings |
| MANAGER | Tasks, materials, vendors, team (cannot invite other managers) |
| EMPLOYEE | Own assigned tasks only — update status, upload photos, add comments |
