# Farm Manager — Progress & Resumability Doc

This file is the single source of truth for where this project stands. Read
it first before doing any further work here — whether that's you, a future
session, or a developer you hand this to. Update it whenever you finish or
start a phase of work.

## What this is

Software for Shahriar's farm business, based on handwritten notes dated
1 Sep 2026 ("IDEA #01"). The plan: start with 200-500 ducks on village land,
grow toward chickens, pigeons/quail, fish, vegetables and cows, hire one
on-site worker, run CCTV across the farm, and manage everything (stock,
sales, purchases, medical/vaccination records, employee pay, expenses)
through one piece of software that can be monitored remotely and eventually
gets AI-assisted forecasting.

## Decisions locked in with the user (2026-09-01)

- **Platform**: web app, built to also work well as an installable
  mobile-friendly PWA (not a separate native app).
- **Build approach**: phased MVP. Ship a working core first, add
  employee/payroll, expense analytics, AI forecasting, and CCTV in later
  phases rather than trying to build everything before anything works.
- **Species scope**: multi-species from day one. The data model treats duck,
  chicken, pigeon/quail, fish, vegetable, and cow as first-class categories,
  even though only ducks are stocked right now.
- **Language**: bilingual UI, Bengali and English, toggle in the sidebar
  (persisted per user account).
- **Deployment target**: not decided yet with the user. The app currently
  runs as a standard Next.js app against a local SQLite file — see "Running
  this project" below. Revisit hosting once Phase 1 is reviewed.

## Tech stack (and why)

- **Next.js 16 (App Router) + TypeScript + React 19** — one codebase for
  both server and UI, Server Actions remove the need for a separate API
  layer for CRUD.
- **Database: SQLite via Node's built-in `node:sqlite`, NOT Prisma.**
  Prisma was tried first but its `prisma init`/engine download needs to
  fetch a schema-engine binary from `binaries.prisma.sh`, which this sandbox's
  network policy blocked (`403 Forbidden`). Node 22's built-in `node:sqlite`
  module needs no network access and no native build step, so the whole
  data layer is hand-written SQL in `src/lib/schema.sql` + `src/lib/db.ts` +
  `src/lib/repo.ts` (reads) + `src/lib/actions/*.ts` (writes, as Server
  Actions). If a future session has unrestricted network access and wants
  a proper ORM instead, swapping this out is a contained, one-layer change
  (schema.sql already documents the full table structure to port).
- **Tailwind CSS v4** for styling, plain CSS custom properties for the
  theme (`src/app/globals.css`) — no component library, kept intentionally
  simple.
- **Auth**: hand-rolled, not NextAuth/Clerk/etc. Username+password
  (bcrypt-hashed), a `sessions` table, an httpOnly cookie. Two roles:
  `owner` and `employee`. Good enough for a single-farm, small-team tool;
  revisit if multi-farm or SSO ever becomes a requirement.
- **i18n**: no library. `src/lib/i18n.ts` is a flat key → {en, bn} string
  dictionary and a `t(lang, key)` helper. Add a string: add a key to both
  language blocks.
- **PWA**: `public/manifest.json` + `public/icon.svg` + theme-color meta.
  No service worker / offline caching yet (see Known gaps).

## What's built — Phase 1 (done, verified 2026-09-01)

- Auth: login/logout, bcrypt passwords, session cookie, owner/employee
  roles. Default seeded login: **username `owner`, password `farm1234`**
  — change this after first sign-in (there's no "change password" UI yet;
  see Known gaps).
- Bilingual toggle (Bengali/English), persisted on the user record.
- Dashboard: per-species summary cards (active batches, current stock,
  30-day purchases/sales/net), upcoming vaccinations/due tasks (next 14
  days), recent activity feed.
- Batches (`/batches`): create/list/view/close/delete. Each batch tracks
  species, breed, source, acquired date, initial vs. current quantity, unit
  cost, notes, status.
- Purchases (`/purchases`): category (animal/feed/medicine/utility/
  equipment/other), item, species, optional linked batch, quantity/unit/
  unit price/total, vendor, date, notes. **Buying more animals into an
  existing batch (category=animal + batch selected) automatically
  increases that batch's current stock.**
- Sales (`/sales`): item, species, optional linked batch, quantity/unit/
  unit price/total, buyer, date, notes. **Linking a batch automatically
  decreases that batch's current stock.**
- Medical/Vaccination (`/medical`): type (vaccination/treatment/checkup/
  mortality), title, species, optional batch, quantity affected, event
  date, next-due date, administered by, cost, notes. **A "mortality"
  record with a batch and quantity automatically decreases that batch's
  current stock.** Records with a `next_due_date` inside the next 14 days
  surface on the dashboard.
- Six species pre-seeded on first run: duck, chicken, pigeon/quail, fish,
  vegetable, cow (`src/lib/db.ts` → `seedSpecies`).
- Schema also includes `employees` and `salary_payments` tables (created,
  unused) so Phase 2 doesn't need a breaking migration.

All of the above was exercised end-to-end with a scripted Playwright run
(login → create batch → feed purchase → animal purchase into that batch →
sale from that batch → vaccination record → confirmed stock math
300 + 50 − 20 = 330 on both the batch list and the dashboard). Build
(`npm run build`) and lint (`npm run lint`) both pass clean.

## What's NOT built yet — future phases

Do these roughly in order; each is independent enough to pick up in its own
session.

**Phase 2 — people and money**
- Employee management UI (list/create/edit) over the existing `employees`
  table.
- Salary payment tracking UI over the existing `salary_payments` table
  (mark pending/paid, due-this-month view — could reuse the dashboard's
  "upcoming" pattern).
- A dedicated expenses/P&L report page: filter purchases+sales by date
  range/species/category, show totals, maybe a simple chart.

**Phase 3 — AI-assisted analytics** (from the notes: "AI capable... analyze
purchases, feed, utility bills, buying/selling price, forecast next
investment and timing")
- Start with straightforward statistics computed from existing
  purchases/sales data (moving averages, month-over-month cost trends,
  simple linear forecast) before reaching for an LLM — it's transparent,
  needs no API key, and is often what "forecast" actually means here.
- If genuine natural-language insight is wanted on top of that, that's
  where an LLM call comes in (needs an API key + network egress the user
  will need to provide/approve).

**Phase 4 — CCTV**
- The notes ask for CCTV monitoring across the farm with remote access
  through this software. This needs one decision from the user first:
  what cameras/DVR will actually be installed (RTSP-capable IP cameras
  vs. a brand's own DVR/app). Until that's known, the honest options are
  (a) an embedded RTSP viewer (e.g. via an HLS-conversion proxy, since
  browsers can't play raw RTSP), or (b) a simple link/embed out to
  whatever the camera vendor's own app/portal provides. Don't build
  either blind — ask first.

**Smaller gaps worth closing whenever convenient**
- No "change password" or "add another user" UI (only the one seeded
  owner account exists; employee-role accounts have no signup path yet).
- No pagination on list pages — fine at current data volume, will matter
  once purchases/sales run into the thousands of rows.
- No CSV/Excel export.
- No offline support (PWA manifest exists but there's no service worker,
  so it needs a live connection to the server it's deployed on).
- No automated tests (Playwright was used for manual/scripted verification
  during development, not committed as a test suite).

## Running this project

```bash
npm install
npm run dev     # http://localhost:3000, default login owner / farm1234
```

`npm run build && npm start` for a production run. The SQLite file lives at
`data/farm.db` (created automatically on first request that touches the
database; gitignored — don't commit real farm data). Requires **Node.js
22.5+** (for `node:sqlite`) — check with `node -v` before running elsewhere.

There is currently no live hosted URL — this only runs where you start it
(this sandbox, or wherever the project folder ends up next). Deploying it
somewhere the owner can reach from a phone (a small VPS, Railway, a
Raspberry Pi at the farm, etc.) is an open decision, not yet made.

## How to resume work in a new session

1. Read this file top to bottom first.
2. `cd` into the project, `npm install` if `node_modules` isn't there,
   `npm run dev` and click through the app to see current state.
3. Check the task list / git log for the last completed phase.
4. Pick the next unbuilt phase above, or ask the user which they want next
   — don't assume Phase 2 is wanted just because it's next on this list.
5. After finishing a phase: run `npm run build` and `npm run lint`, update
   this file's "What's built" / "What's NOT built yet" sections, commit,
   and re-package/deliver to the user the same way as before.

## Git

This is a git repo (`git init` was run by `create-next-app`). Commit at
every meaningful checkpoint so `git log` on its own tells the resumption
story even without this file.
