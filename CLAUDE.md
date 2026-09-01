@AGENTS.md

# Farm Manager — project instructions

Multi-tenant farm/company management app (Next.js 16 App Router + Postgres
via Neon, deployed on Vercel). **Read [PROGRESS.md](PROGRESS.md) first** —
it's the living source of truth for what's built, what's not, decisions
made with the user, and a dated changelog. Update PROGRESS.md's "What's
built" section and changelog (and this file, if a convention below changes)
whenever you land a feature or schema change — don't let this drift stale.

## Coding structure

- Server-only data access lives in `src/lib/*.ts` (`db.ts`, `auth.ts`,
  `repo.ts`, `permissions.ts`). Mutations only happen in `src/lib/actions/
  *.ts`, marked `"use server"`.
- Client forms follow the existing pattern: `useActionState` bound to a
  server action, the shared `SubmitButton` component, and the `.card` /
  `.input` / `.label` / `text-danger` CSS classes from `globals.css` — don't
  introduce a new form styling approach.
- New user-facing strings always get both an `en` and a `bn` key in
  `src/lib/i18n.ts`, added to both dictionary blocks (TypeScript's `DictKey`
  type is derived from the `en` block and will fail to compile if `bn` is
  missing a key, but not the reverse — add to both, always).
- Validate new form input (auth, registration, team management) with `zod`.
  Older CRUD actions still hand-parse `FormData`; that's fine, don't
  block on migrating them, just don't add more hand-parsed validation logic
  to *new* action files.

## Security rules

- Every query touching farm data (batches/purchases/sales/medical_records/
  employees/salary_payments) must filter by `farm_id` taken from the
  session user (`requireUser()`/`requirePermission()`/`requireOwner()`) —
  never from client-submitted form data or URL params. This is the
  multi-tenant isolation boundary; getting it wrong leaks one farm's data
  to another farm.
- Every mutating Server Action must re-check permissions itself
  (`requirePermission(module, action)` or `requireOwner()`), even though the
  UI already hides buttons/links a user can't use — page-level hiding is UX
  only, never the actual enforcement.
- Only `role === "owner"` may manage users, roles, or permissions. This is
  hard-coded (`requireOwner()`), never driven by the configurable
  `user_permissions` table — letting permissions control access to managing
  permissions would allow privilege escalation.
- Passwords are always bcrypt-hashed (`bcryptjs`, cost 10) and never logged,
  returned to the client, or stored anywhere else.
- All SQL goes through the Neon tagged-template (`` sql`...` ``) or
  `sql.query(text)` for schema DDL — never string-concatenate user input
  into a query.
- Schema changes in `src/lib/schema.ts` must stay idempotent (`CREATE ...
  IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`
  then re-add) — there's no separate one-shot migration runner; the same
  statement list creates a fresh database and migrates the already-deployed
  one on every cold start.
