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
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,

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
    language TEXT NOT NULL DEFAULT 'bn' CHECK(language IN ('en','bn')),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  // Migration for a users table created before multi-tenancy existed.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE`,
  `ALTER TABLE users ALTER COLUMN username DROP NOT NULL`,
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
  `CREATE INDEX IF NOT EXISTS idx_sales_species ON sales(species_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_batch ON sales(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_farm ON sales(farm_id)`,

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
];
