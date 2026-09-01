import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

// Single shared SQLite connection for the whole server process.
// Kept on globalThis so Next.js's dev-mode hot-reload doesn't open a fresh
// connection (and re-run seeding) on every file save.

declare global {
  var __farmDb: DatabaseSync | undefined;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "farm.db");

function seedSpecies(db: DatabaseSync) {
  const existing = db.prepare("SELECT COUNT(*) as c FROM species").get() as
    unknown as { c: number };
  if (existing.c > 0) return;

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

  const insert = db.prepare(
    `INSERT INTO species (key, name_en, name_bn, unit_en, unit_bn, icon, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of species) {
    insert.run(s.key, s.name_en, s.name_bn, s.unit_en, s.unit_bn, s.icon, s.sort_order);
  }
}

function seedDefaultOwner(db: DatabaseSync) {
  const existing = db.prepare("SELECT COUNT(*) as c FROM users").get() as
    unknown as { c: number };
  if (existing.c > 0) return;

  const passwordHash = bcrypt.hashSync("farm1234", 10);
  db.prepare(
    `INSERT INTO users (username, password_hash, name, role, language)
     VALUES (?, ?, ?, 'owner', 'bn')`
  ).run("owner", passwordHash, "খামারের মালিক");
}

function createConnection(): DatabaseSync {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf-8"
  );
  db.exec(schema);

  seedSpecies(db);
  seedDefaultOwner(db);

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__farmDb) {
    globalThis.__farmDb = createConnection();
  }
  return globalThis.__farmDb;
}
