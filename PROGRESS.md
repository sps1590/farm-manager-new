# Farm Manager — Progress & Resumability Doc

This file is the single source of truth for where this project stands. Read
it first before doing any further work here — whether that's you, a future
session, or a developer you hand this to. **Update it whenever you finish a
feature or change the schema/architecture** — this is also required by
`CLAUDE.md`.

## What this is

Software for Shahriar's farm business, based on handwritten notes dated
1 Sep 2026 ("IDEA #01"). The plan: start with 200-500 ducks on village land,
grow toward chickens, pigeons/quail, fish, vegetables and cows, hire staff,
run CCTV across the farm, and manage everything (stock, sales, purchases,
medical/vaccination records, employee pay, expenses) through one piece of
software that can be monitored remotely and eventually gets AI-assisted
forecasting. It's now multi-tenant: any number of independent farms/companies
can register and use the same deployment, each with their own team and data.

## Decisions locked in with the user

- **Platform**: web app, built to also work well as an installable
  mobile-friendly PWA (not a separate native app).
- **Build approach**: phased MVP. Ship a working core first, add
  employee/payroll, expense analytics, AI forecasting, and CCTV in later
  phases rather than trying to build everything before anything works.
- **Species scope**: multi-species from day one. Duck, chicken,
  pigeon/quail, fish, vegetable, and cow are first-class categories.
- **Language**: bilingual UI, Bengali and English, toggle in the sidebar
  (persisted per user account).
- **Deployment**: Vercel, with Postgres (Neon, via Vercel's Storage
  integration) as the database. Multi-tenant: the first person for a farm
  self-registers and becomes that farm's owner (2026-09-01).
- **Multi-tenancy & roles** (2026-09-01): every farm/company gets one `farms`
  row; every login account belongs to exactly one farm (`users.farm_id`).
  Roles are free text — Manager/Employee presets plus a custom label — with
  `owner` reserved for the farm's creator. Non-owner access is controlled by
  a separate view/create/edit/delete permission per module (Batches,
  Purchases, Sales, Medical), set by the owner per team member. Team/user
  management itself is always owner-only and is never part of the
  configurable permission matrix (prevents privilege escalation).

## Tech stack (and why)

- **Next.js 16 (App Router) + TypeScript + React 19** — one codebase for
  both server and UI, Server Actions remove the need for a separate API
  layer for CRUD.
- **Database: Postgres via Neon (`@neondatabase/serverless`), NOT Prisma,
  NOT `node:sqlite` anymore.** The app started on `node:sqlite` (see git
  history), which was a fine local-dev choice but doesn't work on Vercel —
  serverless functions have an ephemeral, mostly-read-only filesystem, so a
  file-backed SQLite database resets on every cold start. Migrated to Neon
  Postgres (2026-09-01), provisioned via Vercel's Storage tab → Neon
  integration, which auto-injects a `DATABASE_URL` env var. `@vercel/postgres`
  was considered but is deprecated in favor of `@neondatabase/serverless`
  (the `neon()` HTTP client), which is what's used. The whole data layer is
  hand-written SQL: `src/lib/schema.ts` (DDL, run idempotently on every cold
  start via `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) + `src/lib/db.ts`
  (connection + seeding) + `src/lib/repo.ts` (reads) + `src/lib/actions/*.ts`
  (writes, as Server Actions).
  - **Known limitation**: the Neon HTTP driver has no real cross-statement
    transaction (no `BEGIN`/`COMMIT` spanning two `sql` calls). Registration
    (farm insert, then owner-user insert) handles this by validating
    up-front and compensating with a manual `DELETE` of the farm row if the
    user insert fails, rather than a true transaction. Acceptable for now;
    revisit with Neon's Pool/websocket client if this becomes a real
    consistency problem.
- **Tailwind CSS v4** for styling, plain CSS custom properties for the
  theme (`src/app/globals.css`) — no component library, kept intentionally
  simple.
- **Auth**: hand-rolled, not NextAuth/Clerk/etc. Login by username, email,
  or phone (one "identifier" field) + password (bcrypt-hashed), a `sessions`
  table, an httpOnly cookie. An identifier that matches no user redirects to
  `/register` instead of showing a generic error (2026-09-01).
- **RBAC**: `src/lib/permissions.ts` — `hasPermission()` (sync, owner always
  true), `requirePermission()` / `requireOwner()` / `requireOwnerOrSelf()`
  (async, redirect to `/dashboard` on failure rather than throw — a thrown
  error surfaced Next's generic crash screen for what's really just "you
  can't see this", fixed 2026-09-01). Permissions are loaded once per
  request into `SessionUser.permissions` by `getSessionUser()`.
- **i18n**: no library. `src/lib/i18n.ts` is a flat key → {en, bn} string
  dictionary and a `t(lang, key)` helper. Add a string: add a key to both
  language blocks (TypeScript enforces both objects have the same key set).
- **Validation**: `zod` (already a dependency) is the standard for new
  form-input validation, starting with registration/team-management actions.
  Older actions (batches/purchases/sales/medical) still hand-parse
  `FormData` — fine as-is, migrate opportunistically rather than as a
  dedicated task.
- **PWA**: `public/manifest.json` + `public/icon.svg` + theme-color meta.
  No service worker / offline caching yet (see Known gaps).

## What's built

**Phase 1 — core farm tracking** (done, verified 2026-09-01)
- Bilingual toggle (Bengali/English), persisted on the user record.
- Dashboard: per-species summary cards (active batches, current stock,
  30-day purchases/sales/net), upcoming vaccinations/due tasks (next 14
  days), recent activity feed. Visible to every authenticated farm member,
  not permission-gated (read-only, no mutations).
- Batches (`/batches`): create/list/view/close/delete.
- Purchases (`/purchases`): category/item/species/optional batch/
  quantity/unit/price/vendor/date/notes. Buying animals into an existing
  batch automatically increases that batch's current stock.
- Sales (`/sales`): item/species/optional batch/quantity/unit/price/buyer/
  date/notes. Linking a batch automatically decreases its current stock.
- Medical/Vaccination (`/medical`): vaccination/treatment/checkup/mortality,
  species/batch/quantity affected/dates/administered by/cost/notes. A
  "mortality" record with batch+quantity decreases that batch's stock.
  Records due within 14 days surface on the dashboard.
- Six species pre-seeded on first run: duck, chicken, pigeon/quail, fish,
  vegetable, cow (`src/lib/db.ts` → `seedSpecies`).
- Schema also includes `employees` and `salary_payments` tables (created,
  unused) for Phase 2.

**Deployment & database migration** (done, verified 2026-09-01)
- Deployed to Vercel (`farm-manager-gules.vercel.app`), GitHub-connected
  (`sps1590/farm-manager-new`, `main` branch auto-deploys).
- Migrated the entire data layer from `node:sqlite` to Postgres (Neon) —
  see Tech stack above for why.

**Multi-tenant registration, login, and team RBAC** (done, verified
2026-09-01)
- `/register`: public farm/company signup (farm name, your name, email
  and/or phone, password) — creates a `farms` row and an `owner` user,
  signs them in immediately.
- `/login`: identifier (username/email/phone) + password. Unknown
  identifier → redirect to `/register` (with the typed value prefilled).
  Wrong password on a known identifier → existing generic error (no
  enumeration of which field was wrong).
- `/team` (owner-only): list the farm's login accounts; `/team/new` and
  `/team/[id]/edit` create/edit a member's name, email/phone, role (Manager/
  Employee preset or free-text custom label), and per-module view/create/
  edit/delete permissions via a checkbox matrix. Owner accounts can't be
  edited or deleted through this UI.
- Every batches/purchases/sales/medical query and mutation is scoped to
  `farm_id` from the session (never client input) — one farm can never see
  or modify another farm's data. `getBatch` 404s (not an error) when a
  batch id exists but belongs to a different farm.
- The original `owner`/`farm1234` test login still works, transparently
  migrated into an auto-created "Default Farm" the first time the updated
  schema runs against the already-deployed database.

**Partnership management** (done, verified 2026-09-02)
- The farm has ~14-15 financial partners previously tracked in a paper
  register book. `/partners` (owner-only list + owner-editable "company
  reserve %") and `/partners/[id]` (ledger + controls) digitize this.
- A partner is a `users` row with `is_partner = true` (`role = 'partner'`)
  — reuses the existing login/session/farm-scoping machinery entirely, so a
  partner can log in and see (read-only) their own investment history,
  ownership %, and profit share % via `requireOwnerOrSelf()`. Not part of
  the Team permission matrix (financial data, hard-coded owner-only + self,
  same reasoning as Team management itself).
- `partner_investments` is an append-only ledger (`contribution` |
  `withdrawal`, dated `entry_date` so old register-book entries can be
  backfilled with their real historical date, owner can delete a row to fix
  a mis-entry). **Ownership % is never stored** — `listPartners`/`getPartner`
  in `src/lib/repo.ts` compute it live every time from each partner's net
  investment (contributions minus withdrawals, floored at 0) ÷ the farm's
  total, so it's always correct after any new entry.
- **Profit split** is a separate, owner-set number per partner
  (`users.profit_share_percent`), independent of ownership % on purpose (a
  partner who also manages day-to-day work can get a larger profit share
  than their capital alone implies). `farms.profit_reserve_percent` is the
  owner-declared % kept by the company before the rest is distributed; the
  `/partners` page shows the distributable pool and a running total of
  allocated partner shares as an informational (non-blocking) sanity check.
  No real profit-distribution engine yet — this is bookkeeping/reference
  only until the Phase 2 expenses/P&L report exists.
- Visible in both the sidebar nav (🤝, shown to the owner and to any
  partner) and a dashboard card (total invested + partner count for the
  owner; your own investment/ownership %/profit share % for a partner).

## What's NOT built yet — future phases

**Phase 2 — people and money**
- Employee management UI (list/create/edit) over the existing `employees`
  table (HR/payroll — distinct from the `users` login/RBAC table added
  2026-09-01; intentionally not linked to it).
- Salary payment tracking UI over `salary_payments`.
- A dedicated expenses/P&L report page.

**Phase 3 — AI-assisted analytics**
- Start with straightforward statistics from existing purchases/sales data
  before reaching for an LLM.

**Phase 4 — CCTV**
- Needs a decision from the user on cameras/DVR hardware first.

**Smaller gaps worth closing whenever convenient**
- No "change password" self-service UI for the logged-in user (owner can
  set a new password for a team member via `/team/[id]/edit`, but there's
  no "change my own password" page yet).
- No email/phone verification on registration or team-member creation
  (anyone can claim any email/phone at signup time — acceptable for now,
  revisit if this becomes internet-facing beyond invited farms).
- `edit` permission is stored and enforced for Purchases/Sales/Medical, but
  those modules have no edit UI yet (only create + delete) — only Batches
  has something to "edit" today (status toggle). Wire up edit forms for the
  others if/when that's actually needed.
- No pagination on list pages.
- No CSV/Excel export.
- No offline support (PWA manifest exists but there's no service worker).
- No automated tests.

## Running this project

```bash
npm install
npm run dev     # http://localhost:3000
```

Needs a `DATABASE_URL` env var pointing at a Postgres database (Neon or
otherwise) — either `vercel env pull .env.development.local` (after linking
the Vercel project locally), or set it by hand in `.env.local`
(gitignored). `npm run build && npm start` for a production run.

Default seeded login on a fresh database: **username `owner`, password
`farm1234`** (owner of an auto-created "Default Farm") — change this after
first sign-in, or just register your own farm at `/register` instead.

Live deployment: **https://farm-manager-gules.vercel.app** (Vercel project
`farm-manager`, GitHub `sps1590/farm-manager-new`, auto-deploys `main`).
Database: Neon Postgres, provisioned through Vercel's Storage integration.

## How to resume work in a new session

1. Read this file top to bottom first, then skim `CLAUDE.md` for the
   coding-structure/security rules.
2. `cd` into the project, `npm install` if `node_modules` isn't there,
   `npm run dev` and click through the app to see current state.
3. Check the task list / git log for the last completed phase.
4. Pick the next unbuilt phase above, or ask the user which they want next.
5. After finishing a phase: run `npm run build`, update this file's
   "What's built" / "What's NOT built yet" sections and the changelog
   below, commit, and push.

## Changelog

- **2026-09-02** — Added partnership management: `/partners` (owner) and
  `/partners/[id]` (owner + the partner themself), a `partner_investments`
  ledger table (contributions/withdrawals, backdatable), live-computed
  ownership %, an owner-set per-partner profit share % plus a farm-level
  profit reserve %, a `requireOwnerOrSelf()` access helper, and nav/dashboard
  visibility. Also fixed a stale doc note (RBAC helpers redirect, not throw,
  as of 2026-09-01 — the code was already correct, this file wasn't).
- **2026-09-01** — Deployed to Vercel; migrated database from local
  `node:sqlite` to Postgres (Neon). Added multi-tenant farm/company
  registration, identifier-based login with redirect-to-register on unknown
  identifiers, owner-managed team accounts with per-module CRUD permissions,
  and farm-scoped data isolation across all existing modules. Added this
  changelog and the coding-structure/security rules in `CLAUDE.md`.
