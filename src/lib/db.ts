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

async function ensureSchema(): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement);
  }
  await seedSpecies();
  await seedDefaultFarmAndOwner();
  await backfillOwnerPartners();
}

export async function getDb() {
  if (!globalThis.__farmDbReady) {
    globalThis.__farmDbReady = ensureSchema();
  }
  await globalThis.__farmDbReady;
  return sql;
}
