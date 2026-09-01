import "server-only";
import { getDb } from "./db";
import type {
  BatchRow,
  MedicalRecordRow,
  PurchaseRow,
  SaleRow,
  SpeciesRow,
} from "./types";

// Read-only query helpers shared by server components (dashboard, list pages).
// Mutations live in src/lib/actions/*.ts as "use server" form actions.
//
// node:sqlite returns rows as null-prototype objects, which React Server
// Components cannot pass as props to Client Components ("Only plain objects
// ... can be passed"). plainRow/plainRows spread every row into a fresh
// plain object before it leaves this module.

function plainRow<T>(row: unknown): T | undefined {
  return row ? ({ ...(row as Record<string, unknown>) } as T) : undefined;
}

function plainRows<T>(rows: unknown[]): T[] {
  return rows.map((r) => ({ ...(r as Record<string, unknown>) }) as T);
}

export function listSpecies(): SpeciesRow[] {
  return plainRows<SpeciesRow>(
    getDb().prepare("SELECT * FROM species ORDER BY sort_order").all()
  );
}

export function getSpecies(id: number): SpeciesRow | undefined {
  return plainRow<SpeciesRow>(
    getDb().prepare("SELECT * FROM species WHERE id = ?").get(id)
  );
}

export function listBatches(speciesId?: number): BatchRow[] {
  const db = getDb();
  if (speciesId) {
    return plainRows<BatchRow>(
      db
        .prepare(
          "SELECT * FROM batches WHERE species_id = ? ORDER BY created_at DESC"
        )
        .all(speciesId)
    );
  }
  return plainRows<BatchRow>(
    db.prepare("SELECT * FROM batches ORDER BY created_at DESC").all()
  );
}

export function getBatch(id: number): BatchRow | undefined {
  return plainRow<BatchRow>(
    getDb().prepare("SELECT * FROM batches WHERE id = ?").get(id)
  );
}

export function listBatchesForSelect(): Array<
  Pick<BatchRow, "id" | "name" | "species_id" | "status">
> {
  return plainRows<Pick<BatchRow, "id" | "name" | "species_id" | "status">>(
    getDb()
      .prepare(
        "SELECT id, name, species_id, status FROM batches WHERE status = 'active' ORDER BY name"
      )
      .all()
  );
}

export function listPurchasesByBatch(batchId: number): PurchaseRow[] {
  return plainRows<PurchaseRow>(
    getDb()
      .prepare(
        "SELECT * FROM purchases WHERE batch_id = ? ORDER BY purchase_date DESC, id DESC"
      )
      .all(batchId)
  );
}

export function listSalesByBatch(batchId: number): SaleRow[] {
  return plainRows<SaleRow>(
    getDb()
      .prepare(
        "SELECT * FROM sales WHERE batch_id = ? ORDER BY sale_date DESC, id DESC"
      )
      .all(batchId)
  );
}

export function listMedicalByBatch(batchId: number): MedicalRecordRow[] {
  return plainRows<MedicalRecordRow>(
    getDb()
      .prepare(
        "SELECT * FROM medical_records WHERE batch_id = ? ORDER BY event_date DESC, id DESC"
      )
      .all(batchId)
  );
}

export function listPurchases(limit = 200): PurchaseRow[] {
  return plainRows<PurchaseRow>(
    getDb()
      .prepare(
        "SELECT * FROM purchases ORDER BY purchase_date DESC, id DESC LIMIT ?"
      )
      .all(limit)
  );
}

export function listSales(limit = 200): SaleRow[] {
  return plainRows<SaleRow>(
    getDb()
      .prepare("SELECT * FROM sales ORDER BY sale_date DESC, id DESC LIMIT ?")
      .all(limit)
  );
}

export function listMedicalRecords(limit = 200): MedicalRecordRow[] {
  return plainRows<MedicalRecordRow>(
    getDb()
      .prepare(
        "SELECT * FROM medical_records ORDER BY event_date DESC, id DESC LIMIT ?"
      )
      .all(limit)
  );
}

export function listUpcomingMedical(withinDays = 14): MedicalRecordRow[] {
  const cutoff = new Date(Date.now() + withinDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return plainRows<MedicalRecordRow>(
    getDb()
      .prepare(
        `SELECT * FROM medical_records
         WHERE next_due_date IS NOT NULL AND next_due_date != ''
           AND next_due_date >= ? AND next_due_date <= ?
         ORDER BY next_due_date ASC`
      )
      .all(today, cutoff)
  );
}

export interface SpeciesSummary {
  species: SpeciesRow;
  activeBatches: number;
  currentStock: number;
  purchases30d: number;
  sales30d: number;
}

export function dashboardSummary(): SpeciesSummary[] {
  const db = getDb();
  const species = listSpecies();
  const since = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  return species.map((sp) => {
    const batchAgg = plainRow<{ cnt: number; stock: number }>(
      db
        .prepare(
          `SELECT COUNT(*) as cnt, COALESCE(SUM(current_quantity),0) as stock
           FROM batches WHERE species_id = ? AND status = 'active'`
        )
        .get(sp.id)
    )!;

    const purchaseAgg = plainRow<{ total: number }>(
      db
        .prepare(
          `SELECT COALESCE(SUM(total_amount),0) as total FROM purchases
           WHERE species_id = ? AND purchase_date >= ?`
        )
        .get(sp.id, since)
    )!;

    const saleAgg = plainRow<{ total: number }>(
      db
        .prepare(
          `SELECT COALESCE(SUM(total_amount),0) as total FROM sales
           WHERE species_id = ? AND sale_date >= ?`
        )
        .get(sp.id, since)
    )!;

    return {
      species: sp,
      activeBatches: batchAgg.cnt,
      currentStock: batchAgg.stock,
      purchases30d: purchaseAgg.total,
      sales30d: saleAgg.total,
    };
  });
}

export interface RecentActivityItem {
  kind: "purchase" | "sale";
  id: number;
  date: string;
  item_name: string;
  total_amount: number;
  species_id: number | null;
}

export function recentActivity(limit = 8): RecentActivityItem[] {
  const db = getDb();
  return plainRows<RecentActivityItem>(
    db
      .prepare(
        `SELECT 'purchase' as kind, id, purchase_date as date, item_name, total_amount, species_id
         FROM purchases
         UNION ALL
         SELECT 'sale' as kind, id, sale_date as date, item_name, total_amount, species_id
         FROM sales
         ORDER BY date DESC, id DESC
         LIMIT ?`
      )
      .all(limit)
  );
}
