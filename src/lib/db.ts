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

async function seedDefaultOwner() {
  const existing = await sql`SELECT COUNT(*)::int as c FROM users`;
  if ((existing[0] as { c: number }).c > 0) return;

  const passwordHash = bcrypt.hashSync("farm1234", 10);
  await sql`
    INSERT INTO users (username, password_hash, name, role, language)
    VALUES ('owner', ${passwordHash}, 'খামারের মালিক', 'owner', 'bn')
  `;
}

async function ensureSchema(): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement);
  }
  await seedSpecies();
  await seedDefaultOwner();
}

export async function getDb() {
  if (!globalThis.__farmDbReady) {
    globalThis.__farmDbReady = ensureSchema();
  }
  await globalThis.__farmDbReady;
  return sql;
}
