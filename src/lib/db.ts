import "server-only";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SCHEMA_STATEMENTS } from "./schema";

// Single shared Postgres (Neon) client for the whole server process.
// Schema + seed data are ensured once per process and cached on globalThis
// so Next.js's dev-mode hot-reload doesn't re-run them on every file save.

declare global {
  var __farmDbReady: Promise<void> | undefined;
}

export const sql = neon(process.env.DATABASE_URL!);

async function seedSpecies() {
  const existing = await sql`SELECT COUNT(*)::int as c FROM species`;
  if ((existing[0] as { c: number }).c > 0) return;

  const species: Array<{
    key: string;
    name_en: string;
    name_bn: string;
    unit_en: string;
    unit_bn: string;
    icon: string;
    sort_order: number;
  }> = [
    { key: "duck", name_en: "Duck", name_bn: "হাঁস", unit_en: "birds", unit_bn: "টি", icon: "🦆", sort_order: 1 },
    { key: "chicken", name_en: "Chicken", name_bn: "মুরগী", unit_en: "birds", unit_bn: "টি", icon: "🐔", sort_order: 2 },
    { key: "pigeon_quail", name_en: "Pigeon / Quail", name_bn: "কবুতর / কোয়েল", unit_en: "birds", unit_bn: "টি", icon: "🐦", sort_order: 3 },
    { key: "fish", name_en: "Fish", name_bn: "মাছ", unit_en: "kg", unit_bn: "কেজি", icon: "🐟", sort_order: 4 },
    { key: "vegetable", name_en: "Vegetable", name_bn: "সবজি", unit_en: "kg", unit_bn: "কেজি", icon: "🥬", sort_order: 5 },
    { key: "cow", name_en: "Cow", name_bn: "গরু", unit_en: "head", unit_bn: "টি", icon: "🐄", sort_order: 6 },
    { key: "goat_sheep", name_en: "Goat / Sheep", name_bn: "ছাগল / ভেড়া", unit_en: "head", unit_bn: "টি", icon: "🐐", sort_order: 7 },
  ];

  for (const s of species) {
    await sql`
      INSERT INTO species (key, name_en, name_bn, unit_en, unit_bn, icon, sort_order)
      VALUES (${s.key}, ${s.name_en}, ${s.name_bn}, ${s.unit_en}, ${s.unit_bn}, ${s.icon}, ${s.sort_order})
    `;
  }
}

async function seedDefaultFarmAndOwner() {
  // Rows created before multi-tenancy existed (or left over from a partially
  // applied migration) have farm_id IS NULL -- back-fill those into one
  // Default Farm instead of inserting a fresh owner row, which would collide
  // with the already-unique username/email/phone.
  const orphaned = await sql`SELECT COUNT(*)::int as c FROM users WHERE farm_id IS NULL`;
  if ((orphaned[0] as { c: number }).c > 0) {
    const farmRows = await sql`INSERT INTO farms (name) VALUES ('Default Farm') RETURNING id`;
    const farmId = (farmRows[0] as { id: number }).id;
    await sql`UPDATE users SET farm_id = ${farmId} WHERE farm_id IS NULL`;
    return;
  }

  const existing = await sql`SELECT COUNT(*)::int as c FROM users`;
  if ((existing[0] as { c: number }).c > 0) return;

  // Fresh install -- no users at all yet, seed the default test owner.
  const farmRows = await sql`INSERT INTO farms (name) VALUES ('Default Farm') RETURNING id`;
  const farmId = (farmRows[0] as { id: number }).id;
  const passwordHash = bcrypt.hashSync("farm1234", 10);
  await sql`
    INSERT INTO users (farm_id, username, password_hash, name, role, language, is_partner)
    VALUES (${farmId}, 'owner', ${passwordHash}, 'খামারের মালিক', 'owner', 'bn', true)
  `;
}

// Every owner is also a financial partner in their own farm by default (they
// can invest/withdraw like any other partner). Idempotent backfill for
// owner rows created before this was the default -- new registrations set
// is_partner at insert time instead (see registerAction).
async function backfillOwnerPartners() {
  await sql`UPDATE users SET is_partner = true WHERE role = 'owner' AND is_partner = false`;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  { key: "animal", name_en: "Animal / Livestock", name_bn: "প্রাণী", sort_order: 1 },
  { key: "feed", name_en: "Feed", name_bn: "খাদ্য", sort_order: 2 },
  { key: "medicine", name_en: "Medicine", name_bn: "ওষুধ", sort_order: 3 },
  { key: "utility", name_en: "Utility", name_bn: "ইউটিলিটি", sort_order: 4 },
  { key: "equipment", name_en: "Equipment", name_bn: "যন্ত্রপাতি", sort_order: 5 },
  { key: "other", name_en: "Other", name_bn: "অন্যান্য", sort_order: 6 },
];

const DEFAULT_INCOME_HEADS = [
  { key: "sale", name_en: "Sale", name_bn: "বিক্রয়", sort_order: 1 },
  { key: "subsidy", name_en: "Subsidy / Grant", name_bn: "ভর্তুকি / অনুদান", sort_order: 2 },
  { key: "other", name_en: "Other income", name_bn: "অন্যান্য আয়", sort_order: 3 },
];

// Every existing farm's purchases.category values already match these six
// keys exactly (they were the hard-coded CHECK constraint list), so seeding
// them here changes zero existing data -- it just gives the owner rows to
// edit going forward. Runs per-farm, idempotent via ON CONFLICT DO NOTHING.
async function backfillCategoryDefaults() {
  const farms = await sql`SELECT id FROM farms`;
  for (const farm of farms as { id: number }[]) {
    for (const c of DEFAULT_EXPENSE_CATEGORIES) {
      await sql`
        INSERT INTO expense_categories (farm_id, key, name_en, name_bn, sort_order)
        VALUES (${farm.id}, ${c.key}, ${c.name_en}, ${c.name_bn}, ${c.sort_order})
        ON CONFLICT (farm_id, key) DO NOTHING
      `;
    }
    for (const h of DEFAULT_INCOME_HEADS) {
      await sql`
        INSERT INTO income_heads (farm_id, key, name_en, name_bn, sort_order)
        VALUES (${farm.id}, ${h.key}, ${h.name_en}, ${h.name_bn}, ${h.sort_order})
        ON CONFLICT (farm_id, key) DO NOTHING
      `;
    }
  }
}

// seedSpecies() only runs against a fully empty species table (fresh
// installs), so a species added after go-live needs its own idempotent
// backfill -- ON CONFLICT (key) DO NOTHING makes this safe to re-run on
// every cold start. Not enabled for any farm by default; the owner turns
// it on the same way as any species, via Business Types on /farm.
async function backfillNewSpecies() {
  await sql`
    INSERT INTO species (key, name_en, name_bn, unit_en, unit_bn, icon, sort_order)
    VALUES ('goat_sheep', 'Goat / Sheep', 'ছাগল / ভেড়া', 'head', 'টি', '🐐', 7)
    ON CONFLICT (key) DO NOTHING
  `;
}

// Stable keys auto-posting looks accounts up by -- see src/lib/ledger.ts.
const DEFAULT_ACCOUNTS = [
  { key: "cash", code: "1000", name_en: "Cash & Bank", name_bn: "নগদ ও ব্যাংক", type: "asset", sort_order: 1 },
  { key: "partner_capital", code: "3000", name_en: "Partner Capital", name_bn: "অংশীদার মূলধন", type: "equity", sort_order: 2 },
  { key: "retained_earnings", code: "3900", name_en: "Retained Earnings", name_bn: "সঞ্চিত আয়", type: "equity", sort_order: 3 },
  { key: "sales_income", code: "4000", name_en: "Sales Income", name_bn: "বিক্রয় আয়", type: "income", sort_order: 4 },
  { key: "operating_expenses", code: "5000", name_en: "Operating Expenses", name_bn: "পরিচালন ব্যয়", type: "expense", sort_order: 5 },
  { key: "payroll_expense", code: "5900", name_en: "Payroll Expense", name_bn: "বেতন ব্যয়", type: "expense", sort_order: 6 },
];

async function backfillLedgerAccounts() {
  const farms = await sql`SELECT id FROM farms`;
  for (const farm of farms as { id: number }[]) {
    for (const a of DEFAULT_ACCOUNTS) {
      await sql`
        INSERT INTO accounts (farm_id, key, code, name_en, name_bn, type, sort_order)
        VALUES (${farm.id}, ${a.key}, ${a.code}, ${a.name_en}, ${a.name_bn}, ${a.type}, ${a.sort_order})
        ON CONFLICT (farm_id, key) DO NOTHING
      `;
    }
  }
}

// One-time, per farm: posts a journal entry for every purchase/sale/paid
// salary payment/partner investment that already existed before the
// ledger feature shipped, so the trial balance is representative from
// day one instead of only reflecting transactions from the deploy date
// forward. Guarded by "this farm already has journal_entries rows" so it
// only ever runs once per farm, never touching entries the app itself
// posts afterward via src/lib/ledger.ts.
async function backfillHistoricalLedgerEntries() {
  const farms = await sql`SELECT id FROM farms`;
  for (const farm of farms as { id: number }[]) {
    const already = await sql`SELECT 1 FROM journal_entries WHERE farm_id = ${farm.id} LIMIT 1`;
    if (already.length > 0) continue;

    const accountRows = await sql`SELECT key, id FROM accounts WHERE farm_id = ${farm.id}`;
    const acct: Record<string, number> = {};
    for (const r of accountRows as { key: string; id: number }[]) acct[r.key] = r.id;
    if (!acct.cash || !acct.operating_expenses || !acct.sales_income || !acct.payroll_expense || !acct.partner_capital) {
      continue;
    }

    async function post(entryDate: string, description: string, source: string, sourceId: number, debitAccountId: number, creditAccountId: number, amount: number, memo: string | null) {
      const inserted = await sql`
        INSERT INTO journal_entries (farm_id, entry_date, description, source, source_id)
        VALUES (${farm.id}, ${entryDate}, ${description}, ${source}, ${sourceId})
        RETURNING id
      `;
      const entryId = (inserted[0] as { id: number }).id;
      await sql`
        INSERT INTO journal_lines (farm_id, journal_entry_id, account_id, debit, credit, memo)
        VALUES (${farm.id}, ${entryId}, ${debitAccountId}, ${amount}, 0, ${memo})
      `;
      await sql`
        INSERT INTO journal_lines (farm_id, journal_entry_id, account_id, debit, credit, memo)
        VALUES (${farm.id}, ${entryId}, ${creditAccountId}, 0, ${amount}, ${memo})
      `;
    }

    const purchases = await sql`SELECT id, purchase_date, item_name, category, total_amount FROM purchases WHERE farm_id = ${farm.id}`;
    for (const p of purchases as { id: number; purchase_date: string; item_name: string; category: string; total_amount: number }[]) {
      await post(p.purchase_date, `Purchase: ${p.item_name}`, "purchase", p.id, acct.operating_expenses, acct.cash, p.total_amount, p.category);
    }

    const sales = await sql`SELECT id, sale_date, item_name, income_head, total_amount FROM sales WHERE farm_id = ${farm.id}`;
    for (const s of sales as { id: number; sale_date: string; item_name: string; income_head: string | null; total_amount: number }[]) {
      await post(s.sale_date, `Sale: ${s.item_name}`, "sale", s.id, acct.cash, acct.sales_income, s.total_amount, s.income_head);
    }

    const salaries = await sql`SELECT id, paid_date, pay_period, amount FROM salary_payments WHERE farm_id = ${farm.id} AND status = 'paid'`;
    for (const sp of salaries as { id: number; paid_date: string | null; pay_period: string; amount: number }[]) {
      await post(sp.paid_date ?? "1970-01-01", `Salary paid: ${sp.pay_period}`, "salary", sp.id, acct.payroll_expense, acct.cash, sp.amount, null);
    }

    const investments = await sql`SELECT id, entry_date, entry_type, amount FROM partner_investments WHERE farm_id = ${farm.id}`;
    for (const inv of investments as { id: number; entry_date: string; entry_type: string; amount: number }[]) {
      if (inv.entry_type === "contribution") {
        await post(inv.entry_date, "Partner contribution", "partner", inv.id, acct.cash, acct.partner_capital, inv.amount, null);
      } else {
        await post(inv.entry_date, "Partner withdrawal", "partner", inv.id, acct.partner_capital, acct.cash, inv.amount, null);
      }
    }
  }
}

async function ensureSchema(): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement);
  }
  await seedSpecies();
  await seedDefaultFarmAndOwner();
  await backfillOwnerPartners();
  await backfillCategoryDefaults();
  await backfillNewSpecies();
  await backfillLedgerAccounts();
  await backfillHistoricalLedgerEntries();
}

export async function getDb() {
  if (!globalThis.__farmDbReady) {
    globalThis.__farmDbReady = ensureSchema();
  }
  await globalThis.__farmDbReady;
  return sql;
}
