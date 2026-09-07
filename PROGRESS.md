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
- **File storage: Vercel Blob (`@vercel/blob`)**, provisioned 2026-09-07 via
  Vercel's Storage tab (store name `farm-manager-blob`, private access),
  which auto-injects a `BLOB_READ_WRITE_TOKEN` env var. Used for
  receipt/document attachments on Purchases, Sales, and Medical records
  (`src/lib/attachments.ts`). The store is private, not public, so blob
  URLs are never directly browsable — every read goes through
  `/api/attachments/[id]` (`src/app/api/attachments/[id]/route.ts`), which
  checks the session user's `farm_id` and module `view` permission before
  streaming the file back.

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
- **Profit split**: `users.profit_share_percent` **auto-tracks ownership %
  live by default** (`users.profit_share_auto`, done 2026-09-02) — no
  manual step needed for the common case. The owner can still override a
  specific partner's share (e.g. a working partner getting extra beyond
  their capital), which flips that partner to a fixed custom value until
  `resetPartnerProfitShareAction` switches them back to auto. `farms.
  profit_reserve_percent` is the owner-declared % kept by the company
  before the rest is distributed. Every partner now shows both the **%**
  and a computed **Amount** (derived, not separately editable) — Amount =
  all-time Net Profit (see P&L below) × distributable % × share %.
- Visible in both the sidebar nav (🤝, shown to the owner and to any
  partner) and a dashboard card (total invested + partner count for the
  owner; your own investment/ownership %/profit share % for a partner).
- **Deactivation** (`users.partner_status`, done 2026-09-02): owner can
  deactivate/reactivate a partner from `/partners/[id]`. Deactivating blocks
  login immediately (existing sessions are deleted, not just left to expire)
  and drops them out of the ownership %/profit-share pool entirely — the
  denominator in `fetchPartnerSummaries` only sums *active* partners' net
  investment, so remaining active partners' % increases proportionally.
  Their historical ledger and profile stay intact and visible (owner can
  still add corrective/settlement entries) so reactivating restores them
  cleanly. `/partners` and the dashboard "total invested" figure are
  active-only too, for consistency with the ownership % math.
- **Owner is a partner by default** (done 2026-09-02): registration sets
  `is_partner = true` on the owner row, and an idempotent backfill in
  `ensureSchema()` retroactively flips every pre-existing owner too — the
  owner can invest/withdraw in `/partners` like any other partner.

**Farm Profile & business types** (done, verified 2026-09-02)
- `/farm` (owner-only): edit farm name/contact details; select which
  species/"business types" this farm actually operates (checkboxes over the
  global `species` list, stored in a new `farm_species` join table — no
  rows yet for a farm = "not configured" = every species shows, so nothing
  broke for farms that existed before this page did); quick-link cards to
  Team/Partners/Employees/Reports.
- The selection actually filters species app-wide: `listEnabledSpecies()`
  in `src/lib/repo.ts` is used for the "new record" dropdowns (Batches/
  Purchases/Sales/Medical `/new` pages) and the dashboard's per-species
  cards. List/detail pages keep the unfiltered `listSpecies()` for their
  id-lookup maps, so a record referencing a since-disabled species still
  displays correctly instead of going blank.

**HR (employees & payroll)** (done, verified 2026-09-02) — this was the
"Phase 2" employee management item, now built
- `/employees` (owner-only): list, add, edit staff (`employees` table —
  name, phone, role/title, join date, monthly salary, housing provided,
  active/inactive status). `/employees/[id]`: salary payment ledger
  (`salary_payments` table) — add a payment (pay period, amount, pending/
  paid, paid date), one-click "mark paid", delete a mis-entry. Deleting an
  employee is a real hard delete (cascades their payment history — fine for
  a mistakenly-added record; someone who leaves should be set inactive via
  edit instead).

**Automated P&L report** (done, verified 2026-09-02) — this was the
"Phase 2/3" expenses/P&L report item, now built
- `/reports` (owner-only): date-range filter (default all-time), summary
  cards for Income (sales), Expenses (purchases), Payroll (paid salary
  payments), and Net Profit (colored red/green by sign), plus an expense
  breakdown by purchase category (surfaces utility/feed/medicine spend
  without a separate utility-bill entity). No new data-entry forms — this
  is a pure aggregation over the existing Purchases/Sales/Salary Payments
  tables via `getFinancialSummary()`/`getExpenseBreakdown()` in
  `src/lib/repo.ts`. The all-time (no range) call from this same function
  is what feeds the Partnership profit-share Amount above.

**Profit/Loss table** (done 2026-09-04)
- `/ledger` (owner-only, nav label "Profit / Loss table"): same date-range
  filter pattern as `/reports`, plus (1) a chronological income/expense
  ledger merging every Sale and Purchase in range (`listLedgerEntries()`)
  and (2) a per-partner profit/loss table for that same range
  (`listPartnerProfitLoss()`). Ownership % in that table is still all-time
  (cumulative investment); only the ৳ profit/loss amount is period-scoped —
  `/partners` and `/reports` themselves are untouched and stay all-time.

**Audit trail** (done 2026-09-07, Tier 1 item 1 of the iFARM ToR build plan)
- `/audit` (owner-only): append-only log of every create/edit/delete
  across Purchases, Sales, Batches, Medical, Employees, Salary Payments
  and Partners, showing who, when, what action, and a human-readable
  summary. `logAudit()` in `src/lib/audit.ts` is called from each action
  after its primary write succeeds and never throws, so a logging failure
  can't break the feature it's observing. Team/user management isn't
  wired in yet (out of this pass's approved scope).

**Asset register** (done 2026-09-07, Tier 1 item 2)
- `/assets` (owner-only): name, category (vehicle/machinery/equipment/
  building/tool/other), purchase date, cost, active/inactive status.
  Straight copy of the Employees module's file structure
  (`src/app/(app)/employees/*`), so it's a fifth thing an owner manages the
  same way as Team/Partners/Employees.

**Configurable cost/income heads** (done 2026-09-07, Tier 1 item 5 — the
plan's highest-risk item, touching the live `purchases.category` field)
- New farm-scoped `expense_categories` and `income_heads` tables, each
  seeded per-farm on first run with exactly the six/three values that used
  to be hard-coded (`animal`/`feed`/`medicine`/`utility`/`equipment`/`other`
  and `sale`/`subsidy`/`other`), so every existing purchase/sale row still
  matches a valid value with zero data change. The old `CHECK` constraint on
  `purchases.category` is dropped; validity is now enforced at the
  application layer (`createPurchaseAction`/`createSaleAction` check the
  submitted key against the farm's active rows). `category === "animal"`
  still triggers the batch-stock increment on purchase, unchanged, since the
  `key` values themselves didn't change — only their display names are now
  owner-editable.
- Owner-only management UI added to Farm Profile (`/farm`): two new cards
  ("Expense categories", "Income heads"), each with an inline add form
  (English + Bangla name) and an active/inactive toggle per row
  (`CategoryManager.tsx`, reused for both). Deactivated categories/heads
  stay selectable-looking on historical records (still resolve via
  `categoryLabel()`) but drop out of the New purchase/New sale dropdowns.
- Sales gained a new optional "Income head" field (`sales.income_head`
  column), purchases' existing category field is unchanged in the UI, just
  now backed by farm-editable data instead of a fixed array. Purchases,
  Reports and the Profit/Loss ledger all display categories via the new
  `categoryLabel(key, categories, lang)` helper (`src/lib/labels.ts`)
  instead of the old fixed `purchases.category.<key>` i18n lookup. All
  create/toggle actions are audit-logged.

**File attachments** (done 2026-09-07, Tier 1 item 6 — completes the iFARM
ToR gap-analysis Tier 1 scope)
- New polymorphic `attachments` table (`related_table`/`related_id`, no FK
  since it can point at purchases, sales, or medical_records — application
  code owns cleanup) backed by Vercel Blob (`@vercel/blob`, store
  provisioned by the owner via Vercel's Storage tab, `BLOB_READ_WRITE_TOKEN`
  auto-injected).
- New purchases/sales/medical records can attach one photo or PDF receipt
  (10MB max, image/* or application/pdf only) via a file field on each
  "new record" form. The upload happens inside the same server action as
  the record's own creation — the blob upload is attempted before the
  database insert, so a failed/invalid attachment surfaces as a normal
  form validation error rather than leaving an orphaned record.
- Purchases/Sales/Medical list pages gained an "Attachments" column
  (`AttachmentCell.tsx`) showing a 📎 View link per file plus a Remove
  action gated by that module's existing delete permission.
- Deleting a purchase, sale, or medical record now also deletes its
  attachments (DB rows + the actual blob files, best-effort) via
  `deleteAttachmentsFor()` in `src/lib/attachments.ts` — same
  no-orphaned-data discipline as the batch-stock-reversal fixes earlier in
  this build.

**Task & reminder engine** (done 2026-09-07, Tier 2 item 1 — first item
from the iFARM ToR gap-analysis Tier 2, picked by the owner)
- `/tasks` (visible to every team member, not owner-gated — this isn't
  part of the configurable permission matrix): title, description,
  assignee (any team member or unassigned), due date, and an optional
  repeat (daily/weekly/monthly). Owner creates and deletes tasks; a task's
  own assignee (or the owner) can mark it done. Filterable by
  pending/done/all.
- Completing a recurring task inserts the next occurrence synchronously
  (`due_date` advanced by the recurrence interval) — no cron job, matching
  the rest of this app having no background jobs anywhere.
- Dashboard's Alerts card gained a third source alongside vaccinations and
  pending salary: overdue/due-within-7-days pending tasks. The owner sees
  every such task; anyone else sees only tasks assigned to them
  (`listUpcomingTasks()` in `src/lib/repo.ts`).

**Production recording** (done 2026-09-07, Tier 2 item 2)
- `/production`: a daily production log (milk, eggs, weight checks) kept
  deliberately separate from Sales — a day's egg count is recorded here
  whether or not (or before) it's sold, rather than only ever showing up
  as a generic sale line item. Species-aware product-type presets
  (`NewProductionForm.tsx`, mirrors the sale form's pattern) with a
  custom/other toggle for anything else. Date-range filterable, same
  pattern as `/reports`.
- **New permission-matrix module** `production`, added the same way
  batches/purchases/sales/medical already work: `Module`/`MODULES`/
  `emptyPermissions()` in `src/lib/types.ts`, the `user_permissions.module`
  CHECK constraint extended in `src/lib/schema.ts`, and a `production` row
  in `TeamMemberForm.tsx`'s permission grid — the grid itself and
  `savePermissions()` already iterate `MODULES` generically, so nothing
  else needed updating.
- Reports page gained an additive "Production summary" section (totals by
  product type for the selected range, `getProductionSummary()`).
- **Explicitly out of scope for this pass**: no link to Sales or
  `batches.current_quantity` — recording production doesn't touch stock or
  create a sale, a deliberate deferral matching how attendance doesn't yet
  feed payroll cost.

**Individual animal tracking** (done 2026-09-07, Tier 2 item 3 — the last
of this tier, and its most invasive item)
- Opt-in per species from Farm Profile (`/farm`, new "Individual animal
  tracking" card, one checkbox per currently-enabled species) — stored in
  a new `species_tracking_settings` table, deliberately separate from
  `farm_species` so it's never wiped by `setEnabledSpeciesAction`'s full
  delete+reinsert cycle on that table.
- When enabled for a batch's species, the batch detail page
  (`/batches/[id]`) gains an "Individual animals" section: tag/ID, name,
  sex, status, latest weight, plus an inline add-animal form. Each animal
  links to `/animals/[id]` for its weight history (append-only log,
  `animal_weights`) and a status change (active/sold/dead/culled, with a
  date and note).
- Layered on top of the existing batch model, not a replacement —
  `batches.current_quantity` is still the only source of truth for stock
  math, unchanged. Gated by the existing `batches` permission module
  (view/create/edit/delete), not a new one. Marking an animal sold/dead is
  a manual, independent action from Sales/Medical — matching a specific
  sale or mortality record to one specific animal is intentionally out of
  scope for this pass.
- **This completes the full Tier 2 scope** the owner chose from the iFARM
  ToR gap-analysis report (task engine, production recording, individual
  animal tracking).

**Breeding & incubation tracking** (done 2026-09-07, Tier 3 item 1 — the
first item from the ToR gap-analysis Tier 3, picked and scoped by the
owner: cattle, goat/sheep, duck, and chicken)
- **New species: Goat/Sheep** (🐐) — the app previously seeded exactly six
  species; `seedSpecies()` in `src/lib/db.ts` only runs against a fully
  empty table, so a new `backfillNewSpecies()` (idempotent,
  `ON CONFLICT (key) DO NOTHING`) adds it to the already-live database.
  Off by default for every farm, same as any species — the owner enables
  it via the existing Business Types checkboxes on `/farm`.
- **Two tables, not one** — mammal breeding (cow, goat/sheep: heat → bred →
  pregnancy → calving/kidding, tracked over months, optionally against an
  individually-tracked dam) and poultry incubation (duck, chicken: egg
  collection → incubation → hatch, tracked over weeks, batch-level not
  per-animal) are different processes with genuinely different fields, so
  they're modeled as separate tables (`breeding_records`,
  `incubation_batches`) rather than one table full of nulls.
- `/breeding` (combined list, both types, overdue highlighting) and
  `/breeding/new` (species picker limited to the four species above;
  picking one swaps in the mammal or poultry fields via a small hardcoded
  `species.key` → kind map, same pattern `NewSaleForm.tsx` already uses
  for species-aware product-type presets). Expected due/hatch date is a
  client-side suggestion from typical gestation/incubation length, always
  editable. If Individual Animal Tracking (Tier 2) is enabled for cow or
  goat/sheep, the dam can be picked from that species' tracked animals;
  otherwise a free-text label covers it.
- Gated by the existing `batches` permission module, same choice as
  Individual Animal Tracking — no new permission-matrix module.
- Dashboard Alerts gained a fourth source: upcoming expected due/hatch
  dates within 7 days (`listUpcomingBreedingEvents()`).
- **Recording a birth or a hatch is informational only** — it does not
  create `animals` rows or change `batches.current_quantity`. Surviving
  offspring get added the normal way (a purchase, or a new individual
  animal record), same deliberate non-integration as Production recording
  not touching Sales/stock.

**Double-entry accounting ledger** (done 2026-09-08, Tier 3 item 2 — the
owner explicitly chose auto-posting and a core-only scope, deferring
period-locking/year-end close)
- New `accounts` (chart of accounts, farm-scoped, same shape as
  `expense_categories`/`income_heads`), `journal_entries`, and
  `journal_lines` tables. Six accounts are seeded per farm and are what
  auto-posting always targets by stable key (`cash`, `partner_capital`,
  `retained_earnings`, `sales_income`, `operating_expenses`,
  `payroll_expense`) — `src/lib/ledger.ts`'s `postJournalEntry()`/
  `reverseJournalEntry()` are the only way entries get created or removed.
- **Auto-posts from all four existing money-moving actions**: Purchases
  and Sales post/reverse on create/delete; salary payments post only when
  actually marked paid (at creation-as-paid or at the pending→paid
  transition) and reverse on delete; partner contributions/withdrawals
  post/reverse the same way. Every entry balances (debits = credits),
  enforced in `postJournalEntry()`.
- **One-time backfill** for the farm's pre-existing purchases/sales/paid
  salary payments/partner investments, so the trial balance reflects real
  history from day one, not just transactions from the deploy date
  forward (guarded — runs once per farm, never touches entries the app
  posts afterward).
- `/accounting` (trial balance, date-range filterable), `/accounting
  /accounts` (chart of accounts manager — owner can add more accounts for
  manual entries), `/accounting/accounts/[id]` (one account's ledger with
  running balance), `/accounting/journal` (every entry, auto and manual,
  plus a manual-entry form with dynamic lines that must balance before
  submitting). Owner-only, no new permission-matrix module.
- **This is additive and parallel** — `getFinancialSummary()`, `/reports`,
  `/ledger`, and Partnership profit-share are completely unchanged and
  remain the app's existing money-total calculations; the ledger is a
  second, formal double-entry view over the same underlying transactions.
- **Explicitly out of scope**: period-locking (blocking edits before a
  locked date) and year-end close (closing entries into Retained
  Earnings) — the `retained_earnings` account exists structurally but
  nothing posts to it yet. A separately-scoped follow-on if wanted.

**Post-Tier-3 gap-fill** (done 2026-09-08, from an owner-supplied
reference-app screenshot review — four items picked from the gap
analysis; two related gaps, "farm entry date"/"how obtained"/a real
sire-tag reference on the animal record itself, were explicitly left
out of scope)
- **Medical records linked to a specific animal**: `medical_records`
  gains a nullable `animal_id`. `NewMedicalForm.tsx` shows an optional
  Animal select (same `listActiveAnimalsBySpecies()`-driven conditional
  pattern as Breeding) when the chosen species has active tracked
  animals. Shown on both `/medical`'s list (under the record title) and
  a new "Medical history" section on `/animals/[id]`
  (`listMedicalByAnimal()`). **Informational only** — linking never
  auto-changes the animal's status, same discipline as Breeding records
  not touching `animals`/`batches.current_quantity`.
- **More husbandry event types**: `medical_records.record_type` CHECK
  extended with `herd_spraying`, `deworming`, `hoof_trimming`, `tagging`,
  `other` alongside the original four.
- **Richer milk/production detail**: `production_records` gains nullable
  `animal_id`, `am_total`, `noon_total`, `pm_total`, `consumed_quantity`.
  `NewProductionForm.tsx` reveals a Whole-farm/Individual-cow toggle plus
  AM/Noon/PM inputs when `milk` is selected; those three auto-sum into
  the existing `quantity` field client-side, and a "fed to calves /
  consumed" amount is tracked separately. `quantity` stays the one
  figure `/reports`' production summary sums — the new fields are
  additive detail on top of it, not a replacement.
- **Cattle Breeds, Groups, and a receipt number**: new farm-scoped,
  per-species `animal_breeds`/`animal_groups` master-data tables
  (same shape as `expense_categories`, add/deactivate only — no hard
  delete, matching that precedent), managed from a new "Cattle breeds &
  groups" section on Farm Profile shown per species with Individual
  Animal Tracking enabled. `animals.breed` deliberately stays free text
  (the managed Breeds list is a datalist-backed autofill convenience,
  not a foreign key, so no existing data needs migrating);
  `animals.group_id` is a new nullable FK. `purchases`/`sales` gain a
  nullable `receipt_number` field and list column.
- Same permission gating as the rest of this app's optional-tracking
  features: `batches` module for records, owner-only (`requireOwner()`)
  for the Breeds/Groups master-data manager, matching
  `CategoryManager.tsx`'s existing categories.
- **Bug found and fixed along the way**: a stale-value-leak in
  `NewSaleForm.tsx` (missing `key` props on conditional sibling
  `<div>`s, the same React-reconciliation-by-position bug class first
  found live in `NewBreedingForm.tsx`'s mammal/poultry switch) — toggling
  the species-driven product-type preset could leak one field's value
  under a different field's label. Fixed with explicit `key` props on
  every sibling; the same discipline was applied proactively while
  building `NewMedicalForm.tsx`'s new Animal picker so it didn't ship
  with the same latent bug.

## What's NOT built yet — future phases

**Tier 3, item 3 — native mobile apps: skipped for now** (owner's
decision, 2026-09-08). This was always the odd one out in the Tier 3 set
picked from the ToR gap-analysis — it isn't an addition to this codebase
at all, but a separate project (React Native/Flutter, its own repo, app
store developer accounts). Items 1 and 2 (breeding/incubation tracking,
double-entry accounting ledger) shipped; this one is on hold. Revisit if
the owner decides it's worth the separate undertaking — the existing PWA
manifest (see "Smaller gaps" below) is the lower-cost middle ground
already in place.

**Phase 2 — people and money** (done as of 2026-09-02 — see HR and
Automated P&L report above)

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

- **2026-09-08** — Post-Tier-3 gap-fill, all four owner-approved items
  from a reference-app screenshot review: medical records optionally
  linked to a specific tracked animal (informational only, shown on
  `/medical` and the animal's own page), five new husbandry event types,
  richer milk/production detail (AM/Noon/PM auto-summing into `quantity`,
  individual-cow mode, a "consumed" amount), and managed per-species
  Cattle Breeds/Groups plus a `receipt_number` field on Purchases/Sales.
  Also fixed a latent stale-value-leak bug in `NewSaleForm.tsx` (missing
  `key` props on conditional siblings) found while auditing for the same
  bug class, and a pre-existing `no-assign-module-variable` lint error in
  `team.ts`.
- **2026-09-08** — Tier 3, item 3 (native mobile apps) skipped for now,
  owner's decision — see "What's NOT built yet" below. No code change.
- **2026-09-08** — Tier 3, item 2: double-entry accounting ledger. New
  `accounts`/`journal_entries`/`journal_lines` tables, auto-posting wired
  into Purchases, Sales, Salary Payments (on paid) and Partner
  Investments (create + delete/reverse), a one-time backfill of existing
  historical transactions, and a new owner-only `/accounting` section
  (trial balance, chart of accounts, journal, per-account ledger).
  Additive and parallel to the existing Reports/Ledger/Partnership money
  calculations, which are unchanged. Period-locking and year-end close
  are deferred.
- **2026-09-07** — Tier 3, item 1: breeding & incubation tracking (cattle,
  goat/sheep, duck, chicken — scoped directly by the owner from the ToR
  gap-analysis Tier 3 list). Added Goat/Sheep as a new species (idempotent
  backfill, since `seedSpecies()` only runs on an empty table). New
  `breeding_records` (mammal) and `incubation_batches` (poultry) tables,
  a combined `/breeding` list, and a species-aware new-record form.
  Dashboard alerts gained upcoming due/hatch dates. Recording a birth or
  hatch is informational only, matching the same non-integration-with-
  stock precedent as Production recording.
- **2026-09-07** — Tier 2, item 3: individual animal tracking (opt-in per
  species from Farm Profile). New `animals`/`animal_weights`/
  `species_tracking_settings` tables. Batch detail page gains an
  "Individual animals" section when enabled for that species; each animal
  gets its own page for weight history and status changes. Layered on top
  of batches, not replacing them — `batches.current_quantity` is
  unchanged. This completes the Tier 2 scope the owner picked from the
  iFARM ToR gap-analysis report.
- **2026-09-07** — Tier 2, item 2: production recording. New `/production`
  module (daily milk/egg/weight log, independent of Sales) with a new
  fifth permission-matrix module (`production`) alongside batches/
  purchases/sales/medical. Reports page gained a production-summary
  section.
- **2026-09-07** — Tier 2, item 1: task & reminder engine. New `/tasks`
  module (visible to all team members) generalizes the vaccination
  due-date pattern into assignable, trackable, optionally-recurring jobs.
  Completing a recurring task auto-creates its next occurrence. Dashboard
  alerts now include overdue/due-soon tasks alongside vaccinations and
  pending salary payments.
- **2026-09-07** — Tier 1, item 6: file attachments — completes the Tier 1
  scope from the iFARM ToR gap-analysis build plan. New `attachments` table
  (polymorphic, backed by Vercel Blob) lets a purchase, sale, or medical
  record carry a receipt/vet-bill photo or PDF, uploaded from the same
  "new record" form. List pages show an Attachments column with view/remove
  actions; deleting a record now cleans up its attachments too (DB rows and
  the underlying blob files).
- **2026-09-07** — Tier 1, item 5: configurable cost/income heads. New
  `expense_categories`/`income_heads` tables (farm-scoped, seeded with
  today's fixed values so no existing purchase/sale is invalidated),
  `CHECK` constraint on `purchases.category` dropped in favor of
  application-layer validation, new owner-only management cards on Farm
  Profile to add/deactivate categories and income heads, new optional
  Income head field on the sale form, and `categoryLabel()` replacing the
  old fixed-enum i18n lookup on Purchases/Reports/Profit-Loss table.
- **2026-09-07** — Tier 1, item 4: HR attendance and leave. Employee
  detail page gained a daily attendance mark (present/absent/half-day/
  leave, one row per employee per day via `UNIQUE(employee_id, date)` +
  `ON CONFLICT` upsert, so re-marking today corrects it) and a leave
  application/approve-or-reject flow (casual/sick/earned/unpaid/other).
  New `attendance` and `leave_applications` tables, both wired into the
  audit trail. Feeding attendance into payroll cost is explicitly out of
  scope for this pass — `getFinancialSummary()` still counts only paid
  salary payments.
- **2026-09-07** — Tier 1, item 3: alerts beyond vaccinations. The
  dashboard's vaccination-due card is now a general "Alerts" card
  (`listPendingSalaryAlerts()` in repo.ts) that also surfaces pending/
  unpaid salary payments for the owner, each entry linking straight to the
  record. Lease/document-expiry alerts stay deferred until file
  attachments (item 6) give them something with an expiry date to hang
  off.
- **2026-09-07** — Tier 1, item 2: simple asset register. New `/assets`
  module (owner-only) for equipment, vehicles and machinery — name,
  category, purchase date, cost, active/inactive status — mirroring the
  Employees list/new/detail/edit pattern exactly. Wired into the audit
  trail from the start.
- **2026-09-07** — Tier 1, item 1: audit trail. New append-only
  `audit_log` table + `logAudit()` helper (`src/lib/audit.ts`, swallows its
  own errors so logging can never break the action it observes), wired into
  every create/edit/delete across Purchases, Sales, Batches, Medical,
  Employees, Salary Payments and Partners. New owner-only `/audit` page
  (`nav.audit`) lists who did what, when. While touching Medical for this,
  found and fixed the same class of bug Phase 0 fixed for sales/purchases:
  `deleteMedicalRecordAction` never reversed the batch-stock decrease a
  mortality record made on create.
- **2026-09-07** — Stability pass (Phase 0 of the Tier 1 build plan — the
  app is now live on a real farm, so correctness and speed came first).
  Fixed a real data-integrity bug: deleting a sale or an "animal" purchase
  never reversed the batch-stock change its creation made, so the batch's
  `current_quantity` could drift from reality (`deleteSaleAction`,
  `deletePurchaseAction` in `src/lib/actions/sales.ts`/`purchases.ts`).
  Parallelized independent reads with `Promise.all` across the dashboard
  and every list/detail page that was awaiting unrelated queries
  sequentially, cutting page-load round trips with no behavior change.
- **2026-09-04** — New owner-only "Profit / Loss table" page (`/ledger`,
  `nav.ledger`): a date-range-filterable income/expense ledger (every sale
  and purchase, chronological, `listLedgerEntries()`) plus a per-partner
  profit/loss table for that same period (`listPartnerProfitLoss()` — reuses
  `fetchPartnerSummaries()` with an optional `range`, so ownership % stays
  all-time-based while the ৳ profit/loss amount reflects only the selected
  dates). Existing `/partners` and `/reports` pages are unchanged (still
  always all-time for partner amounts, per the documented design decision).
- **2026-09-04** — Total amount on the New sale/purchase forms now
  auto-calculates from Quantity x Unit price (`useAutoTotal` hook,
  `src/hooks/useAutoTotal.ts`); still a normal editable field for manual
  overrides. Partnership's "Distributable to partners"/"Total allocated" and
  the dashboard's "Your Partnership" profit-share figure now show both the
  % and the computed ৳ amount, not just the %.
- **2026-09-04** — New sale form now offers a species-specific "Product
  type" preset (Cow → Cow/Milk/Calf; Chicken/Duck/Pigeon-Quail → the bird
  (meat)/Egg) that fills in the Item field, with a "Custom / other" option
  that leaves it free text as before. Species without a preset list (fish,
  vegetable) are unaffected. `NewSaleForm.tsx`, keyed off `species.key`.
- **2026-09-04** — UI/UX redesign: refined organic-green/warm-neutral color
  palette (`globals.css` tokens), Inter + Noto Sans Bengali via
  `next/font/google` replacing the system font stack, upgraded
  `.card`/`.btn-primary`/`.btn-secondary`/`.input` with modern radii,
  shadows, and focus rings. Sidebar rebuilt as a client component
  (`src/components/Sidebar.tsx`) with Lucide icons, active-link
  highlighting (`usePathname`), and a user-initial avatar; brand mark
  extracted into `src/components/Logo.tsx` and reused on login/register.
  Farm Profile's quick-link cards got matching icon treatment. Emoji used
  for species/content stay as-is (data-driven, fits the organic theme).
- **2026-09-04** — Dashboard now shows the farm name plus the signed-in
  user's name and position (Owner / Partner / Manager / Employee / any
  custom role text) right below it — new `roleLabel()` helper in `i18n.ts`,
  also used by the sidebar footer for consistency. All currency amounts
  across the app now render with thousand separators and 2 decimal places
  (`formatCurrency()` in `src/lib/format.ts`).
- **2026-09-02** — Owner is now a partner by default (registration +
  idempotent backfill for existing owners). Profit share % auto-syncs to
  ownership % live (with manual override + reset-to-auto still available);
  Partnership pages now show both % and a computed ৳ Amount, driven by a new
  automated P&L (`getFinancialSummary()`/`getExpenseBreakdown()`). Added the
  Farm Profile hub (`/farm`) with farm details + a business-type selector
  that actually filters the species dropdowns app-wide (`farm_species`
  table, `listEnabledSpecies()`). Built the HR module (`/employees`) over
  the existing `employees`/`salary_payments` tables. Built `/reports`
  (income/expenses/payroll/net profit, date-range filterable, expense
  category breakdown). Closes out the "Phase 2 — people and money" item.
- **2026-09-02** — Added partner deactivation: blocks login (and kills
  existing sessions immediately), excludes the partner from the live
  ownership %/profit-share pool, keeps their ledger for records, reversible.
  `/partners` and dashboard totals now reflect active partners only.
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
