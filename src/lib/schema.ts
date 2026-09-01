// Farm Manager database schema (Postgres via Neon).
// Multi-species from day one: duck, chicken, pigeon/quail, fish, vegetable, cow.
// Each statement is re-run (idempotently, via IF NOT EXISTS) on cold start.

const NOW_TEXT = "to_char(now(), 'YYYY-MM-DD HH24:MI:SS')";

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','employee')),
    language TEXT NOT NULL DEFAULT 'bn' CHECK(language IN ('en','bn')),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,

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
  `CREATE INDEX IF NOT EXISTS idx_batches_species ON batches(species_id)`,

  `CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
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
  `CREATE INDEX IF NOT EXISTS idx_purchases_species ON purchases(species_id)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_batch ON purchases(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)`,

  `CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
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
  `CREATE INDEX IF NOT EXISTS idx_sales_species ON sales(species_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_batch ON sales(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)`,

  `CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
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
  `CREATE INDEX IF NOT EXISTS idx_medical_batch ON medical_records(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_medical_due ON medical_records(next_due_date)`,

  // Phase 2 tables (schema ready now so Phase 1 data never needs a breaking migration;
  // UI for these lands in Phase 2 -- see PROGRESS.md).
  `CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
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

  `CREATE TABLE IF NOT EXISTS salary_payments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    pay_period TEXT NOT NULL,
    paid_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT ${NOW_TEXT}
  )`,
];
