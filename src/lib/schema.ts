// Farm Manager database schema (Postgres via Neon).
// Multi-species from day one: duck, chicken, pigeon/quail, fish, vegetable, cow.
// Multi-tenant: every farm/company gets one `farms` row; all login accounts and
// farm data are scoped to a farm_id.
//
// Every statement here must be safe to re-run on every cold start (CREATE ...
// IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS then
// re-add). This lets the same statement list both create a brand new database
// and idempotently migrate an already-deployed one -- there is no separate
// one-shot migration runner.

const NOW_TEXT = "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')";

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    profit_reserve_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE farms ADD COLUMN IF NOT EXISTS profit_reserve_percent DOUBLE PRECISION NOT NULL DEFAULT 0`,

  // farm_id is nullable at the DB level (not NOT NULL) so this ADD COLUMN is
  // safe against the rows that existed before multi-tenancy; application code
  // always supplies it on insert.
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_partner BOOLEAN NOT NULL DEFAULT false,
    profit_share_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    profit_share_auto BOOLEAN NOT NULL DEFAULT true,
    partner_status TEXT NOT NULL DEFAULT 'active' CHECK(partner_status IN ('active','inactive')),
    language TEXT NOT NULL DEFAULT 'bn' CHECK(language IN ('en','bn')),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  // Migration for a users table created before multi-tenancy existed.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE`,
  `ALTER TABLE users ALTER COLUMN username DROP NOT NULL`,
  // Partnership management: a partner is a users row with is_partner = true.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profit_share_percent DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profit_share_auto BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_partner_status_check`,
  `ALTER TABLE users ADD CONSTRAINT users_partner_status_check CHECK (partner_status IN ('active','inactive'))`,
  // role used to be CHECK(role IN ('owner','employee')); roles are free text now
  // (fixed presets + custom labels chosen in the UI), enforcement happens in code.
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
  // Every user needs at least one way to log in.
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_identifier_check`,
  `ALTER TABLE users ADD CONSTRAINT users_identifier_check CHECK (username IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_users_farm ON users(farm_id)`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,

  // Per-user, per-module CRUD permissions. Only relevant for non-owner roles --
  // role = 'owner' always has full access regardless of rows here (see
  // src/lib/permissions.ts). Team/user management is never gated by this table
  // (hard-coded owner-only) to avoid privilege-escalation via misconfiguration.
  `CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK(module IN ('batches','purchases','sales','medical')),
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id, module)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)`,

  // Investment/withdrawal ledger for financial partners (users.is_partner =
  // true). Ownership % is never stored -- always computed live from this
  // table (see src/lib/repo.ts -> listPartners) so it's always correct.
  `CREATE TABLE IF NOT EXISTS partner_investments (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('contribution','withdrawal')),
    amount DOUBLE PRECISION NOT NULL,
    entry_date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_partner_investments_farm ON partner_investments(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_partner_investments_user ON partner_investments(user_id)`,

  `CREATE TABLE IF NOT EXISTS species (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    unit_en TEXT NOT NULL,
    unit_bn TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  // Business-type selection: which species a farm actually operates. No
  // rows for a farm = "not configured yet" = every species shows (keeps
  // every farm that existed before this feature working unchanged).
  `CREATE TABLE IF NOT EXISTS farm_species (
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    PRIMARY KEY (farm_id, species_id)
  )`,

  `CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species(id),
    name TEXT NOT NULL,
    breed TEXT,
    source TEXT,
    acquired_date TEXT,
    initial_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    current_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit_cost DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT},
    updated_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE batches ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_batches_species ON batches(species_id)`,
  `CREATE INDEX IF NOT EXISTS idx_batches_farm ON batches(farm_id)`,

  `CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER REFERENCES species(id),
    batch_id INTEGER REFERENCES batches(id),
    category TEXT NOT NULL CHECK(category IN ('animal','feed','medicine','utility','equipment','other')),
    item_name TEXT NOT NULL,
    quantity DOUBLE PRECISION,
    unit TEXT,
    unit_price DOUBLE PRECISION,
    total_amount DOUBLE PRECISION NOT NULL,
    purchase_date TEXT NOT NULL,
    vendor TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_species ON purchases(species_id)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_batch ON purchases(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_farm ON purchases(farm_id)`,
  // category is now farm-configurable master data (expense_categories below)
  // rather than a fixed set -- validated at the application layer instead.
  `ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_category_check`,

  `CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER REFERENCES species(id),
    batch_id INTEGER REFERENCES batches(id),
    item_name TEXT NOT NULL,
    quantity DOUBLE PRECISION,
    unit TEXT,
    unit_price DOUBLE PRECISION,
    total_amount DOUBLE PRECISION NOT NULL,
    sale_date TEXT NOT NULL,
    buyer TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE sales ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `ALTER TABLE sales ADD COLUMN IF NOT EXISTS income_head TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_sales_species ON sales(species_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_batch ON sales(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_farm ON sales(farm_id)`,

  // Farm-configurable master data replacing the old hard-coded purchase
  // category list and adding an equivalent for income. "key" is the stable
  // value stored on purchases.category / sales.income_head; name_en/name_bn
  // are what the owner sees and can edit. Deactivated (status='inactive')
  // heads are never deleted so historical records keep resolving correctly.
  `CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT},
    UNIQUE(farm_id, key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_expense_categories_farm ON expense_categories(farm_id)`,

  `CREATE TABLE IF NOT EXISTS income_heads (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT},
    UNIQUE(farm_id, key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_income_heads_farm ON income_heads(farm_id)`,

  `CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER REFERENCES species(id),
    batch_id INTEGER REFERENCES batches(id),
    record_type TEXT NOT NULL CHECK(record_type IN ('vaccination','treatment','checkup','mortality')),
    title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    next_due_date TEXT,
    quantity_affected DOUBLE PRECISION,
    administered_by TEXT,
    cost DOUBLE PRECISION,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_medical_batch ON medical_records(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_medical_due ON medical_records(next_due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_medical_farm ON medical_records(farm_id)`,

  // Phase 2 tables (schema ready now so Phase 1 data never needs a breaking migration;
  // UI for these lands in Phase 2 -- see PROGRESS.md).
  `CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    role_title TEXT,
    join_date TEXT,
    monthly_salary DOUBLE PRECISION,
    housing_provided INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_employees_farm ON employees(farm_id)`,

  `CREATE TABLE IF NOT EXISTS salary_payments (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    pay_period TEXT NOT NULL,
    paid_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_salary_payments_farm ON salary_payments(farm_id)`,

  // Append-only. Nothing in the app ever updates or deletes a row here --
  // only INSERT via logAudit() (src/lib/audit.ts). before_json/after_json
  // hold whatever snapshot the call site captured (often partial, not a
  // full row), for a human-readable trail rather than a strict field diff.
  `CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
    module TEXT NOT NULL,
    record_id INTEGER,
    summary TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_farm ON audit_log(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)`,

  `CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('vehicle','machinery','equipment','building','tool','other')),
    purchase_date TEXT,
    cost DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_assets_farm ON assets(farm_id)`,

  // One row per employee per day -- UNIQUE(employee_id, date) makes "mark
  // today" an upsert (INSERT ... ON CONFLICT), so re-marking the same day
  // corrects it rather than creating a duplicate.
  `CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present','absent','half_day','leave')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT},
    UNIQUE(employee_id, date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_farm ON attendance(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id)`,

  `CREATE TABLE IF NOT EXISTS leave_applications (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK(leave_type IN ('casual','sick','earned','unpaid','other')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_leave_farm ON leave_applications(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_applications(employee_id)`,

  // Polymorphic (related_table/related_id, no FK -- points at purchases,
  // sales, or medical_records) file attachments, backed by Vercel Blob.
  // related_id has no FK because it can point at any of several tables;
  // application code is responsible for deleting a record's attachments
  // (DB row + blob) when the record itself is deleted.
  `CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    related_table TEXT NOT NULL,
    related_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    filename TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_related ON attachments(farm_id, related_table, related_id)`,

  // Tier 2: task & reminder engine. Not part of the configurable
  // permission matrix (owner manages the list; an assignee just acts on
  // what's theirs) -- see completeTaskAction in src/lib/actions/tasks.ts.
  // A recurring task's next occurrence is inserted synchronously when the
  // current one is completed, no cron job.
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TEXT NOT NULL,
    recurrence TEXT NOT NULL DEFAULT 'none' CHECK(recurrence IN ('none','daily','weekly','monthly')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done')),
    completed_at TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_farm ON tasks(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`,

  // Tier 2: production recording (milk/egg/weight etc), a daily log
  // distinct from Sales -- deliberately not linked to batches.current_quantity
  // or sales, same kind of documented deferral as attendance not yet
  // feeding payroll. product_type is plain text (a small stable set:
  // milk/egg/weight, or free text for "other"), resolved for display via
  // productionTypeLabel() in src/lib/labels.ts.
  `CREATE TABLE IF NOT EXISTS production_records (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER REFERENCES species(id),
    batch_id INTEGER REFERENCES batches(id),
    product_type TEXT NOT NULL,
    record_date TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    unit TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_production_farm ON production_records(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_production_date ON production_records(record_date)`,
  `CREATE INDEX IF NOT EXISTS idx_production_batch ON production_records(batch_id)`,

  // Extend the permission-matrix module CHECK to admit the new "production"
  // module (same idempotent-migration pattern used when purchases.category
  // moved off a fixed CHECK in Tier 1).
  `ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_module_check`,
  `ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_module_check CHECK (module IN ('batches','purchases','sales','medical','production'))`,

  // Tier 2: individual animal tracking, opt-in per species. Deliberately a
  // separate table from farm_species rather than a new column on it --
  // setEnabledSpeciesAction (src/lib/actions/farm.ts) fully DELETEs and
  // re-inserts every farm_species row on every save, which would silently
  // wipe a flag stored on that same table.
  `CREATE TABLE IF NOT EXISTS species_tracking_settings (
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    individual_tracking BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (farm_id, species_id)
  )`,

  // Layered on top of the batch model, not a replacement for it --
  // batches.current_quantity stays the source of truth for stock math
  // exactly as before; an animal record adds identity/history on top.
  // Gated by the existing "batches" permission module, not a new one.
  `CREATE TABLE IF NOT EXISTS animals (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species(id),
    tag TEXT NOT NULL,
    name TEXT,
    sex TEXT NOT NULL DEFAULT 'unknown' CHECK(sex IN ('male','female','unknown')),
    birth_date TEXT,
    breed TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','dead','culled')),
    status_date TEXT,
    status_notes TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT},
    UNIQUE(farm_id, tag)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_animals_farm ON animals(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_batch ON animals(batch_id)`,

  // Append-only weight-history log per animal.
  `CREATE TABLE IF NOT EXISTS animal_weights (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    weigh_date TEXT NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_animal_weights_animal ON animal_weights(animal_id)`,

  // Tier 3: breeding & incubation tracking. Two tables, not one, because
  // mammal breeding (per-dam, heat-to-birth over months) and poultry
  // incubation (per-batch, egg-to-hatch over weeks) are different
  // processes with different fields -- see PROGRESS.md. Gated by the
  // existing "batches" permission module, not a new one.
  `CREATE TABLE IF NOT EXISTS breeding_records (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species(id),
    batch_id INTEGER REFERENCES batches(id),
    dam_animal_id INTEGER REFERENCES animals(id),
    dam_label TEXT,
    sire_label TEXT,
    method TEXT NOT NULL DEFAULT 'natural' CHECK(method IN ('natural','ai')),
    bred_date TEXT NOT NULL,
    expected_due_date TEXT,
    status TEXT NOT NULL DEFAULT 'bred' CHECK(status IN ('bred','confirmed_pregnant','not_pregnant','birthed','lost')),
    birth_date TEXT,
    offspring_count INTEGER,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_breeding_farm ON breeding_records(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_breeding_due ON breeding_records(expected_due_date)`,

  `CREATE TABLE IF NOT EXISTS incubation_batches (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    species_id INTEGER NOT NULL REFERENCES species(id),
    batch_id INTEGER REFERENCES batches(id),
    method TEXT NOT NULL DEFAULT 'broody' CHECK(method IN ('broody','incubator')),
    egg_count INTEGER,
    start_date TEXT NOT NULL,
    expected_hatch_date TEXT,
    status TEXT NOT NULL DEFAULT 'incubating' CHECK(status IN ('incubating','hatched','failed')),
    hatch_date TEXT,
    hatched_count INTEGER,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_incubation_farm ON incubation_batches(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_incubation_hatch ON incubation_batches(expected_hatch_date)`,

  // Tier 3: double-entry accounting ledger. Additive and parallel to
  // getFinancialSummary()/reports/partnership -- this doesn't replace
  // those, it's a second, formal view over the same underlying
  // transactions. "key" is the stable value auto-posting looks accounts
  // up by (never a hardcoded id), same shape as expense_categories/
  // income_heads. Owner-only, no new permission-matrix module.
  `CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    code TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('asset','liability','equity','income','expense')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT},
    UNIQUE(farm_id, key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_farm ON accounts(farm_id)`,

  // source/source_id identify which Purchase/Sale/salary payment/partner
  // investment an auto-posted entry came from, so deleting that record can
  // find and reverse its entry (reverseJournalEntry() in src/lib/ledger.ts).
  // source_id is null for manual entries.
  `CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    entry_date TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','purchase','sale','salary','partner')),
    source_id INTEGER,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_farm ON journal_entries(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(farm_id, source, source_id)`,

  // A entry's lines must sum debits = credits -- enforced in
  // postJournalEntry() (src/lib/ledger.ts), not a DB constraint, same as
  // every other multi-row invariant in this app.
  `CREATE TABLE IF NOT EXISTS journal_lines (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    debit DOUBLE PRECISION NOT NULL DEFAULT 0,
    credit DOUBLE PRECISION NOT NULL DEFAULT 0,
    memo TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id)`,
];
