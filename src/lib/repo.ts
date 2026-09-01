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

function plainRow<T>(row: unknown): T | undefined {
  return row ? ({ ...(row as Record<string, unknown>) } as T) : undefined;
}

function plainRows<T>(rows: unknown[]): T[] {
  return rows.map((r) => ({ ...(r as Record<string, unknown>) }) as T);
}

export async function listSpecies(): Promise<SpeciesRow[]> {
  const db = await getDb();
  return plainRows<SpeciesRow>(
    await db`SELECT * FROM species ORDER BY sort_order`
  );
}

export async function getSpecies(id: number): Promise<SpeciesRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM species WHERE id = ${id}`;
  return plainRow<SpeciesRow>(rows[0]);
}

export async function listBatches(speciesId?: number): Promise<BatchRow[]> {
  const db = await getDb();
  if (speciesId) {
    return plainRows<BatchRow>(
      await db`SELECT * FROM batches WHERE species_id = ${speciesId} ORDER BY created_at DESC`
    );
  }
  return plainRows<BatchRow>(
    await db`SELECT * FROM batches ORDER BY created_at DESC`
  );
}

export async function getBatch(id: number): Promise<BatchRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM batches WHERE id = ${id}`;
  return plainRow<BatchRow>(rows[0]);
}

export async function listBatchesForSelect(): Promise<
  Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>
> {
  const db = await getDb();
  return plainRows<Pick<BatchRow, "id" | "name" | "species_id" | "status">>(
    await db`SELECT id, name, species_id, status FROM batches WHERE status = 'active' ORDER BY name`
  );
}

export async function listPurchasesByBatch(batchId: number): Promise<PurchaseRow[]> {
  const db = await getDb();
  return plainRows<PurchaseRow>(
    await db`SELECT * FROM purchases WHERE batch_id = ${batchId} ORDER BY purchase_date DESC, id DESC`
  );
}

export async function listSalesByBatch(batchId: number): Promise<SaleRow[]> {
  const db = await getDb();
  return plainRows<SaleRow>(
    await db`SELECT * FROM sales WHERE batch_id = ${batchId} ORDER BY sale_date DESC, id DESC`
  );
}

export async function listMedicalByBatch(batchId: number): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  return plainRows<MedicalRecordRow>(
    await db`SELECT * FROM medical_records WHERE batch_id = ${batchId} ORDER BY event_date DESC, id DESC`
  );
}

export async function listPurchases(limit = 200): Promise<PurchaseRow[]> {
  const db = await getDb();
  return plainRows<PurchaseRow>(
    await db`SELECT * FROM purchases ORDER BY purchase_date DESC, id DESC LIMIT ${limit}`
  );
}

export async function listSales(limit = 200): Promise<SaleRow[]> {
  const db = await getDb();
  return plainRows<SaleRow>(
    await db`SELECT * FROM sales ORDER BY sale_date DESC, id DESC LIMIT ${limit}`
  );
}

export async function listMedicalRecords(limit = 200): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  return plainRows<MedicalRecordRow>(
    await db`SELECT * FROM medical_records ORDER BY event_date DESC, id DESC LIMIT ${limit}`
  );
}

export async function listUpcomingMedical(withinDays = 14): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() + withinDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return plainRows<MedicalRecordRow>(
    await db`
      SELECT * FROM medical_records
      WHERE next_due_date IS NOT NULL AND next_due_date != ''
        AND next_due_date >= ${today} AND next_due_date <= ${cutoff}
      ORDER BY next_due_date ASC
    `
  );
}

export interface SpeciesSummary {
  species: SpeciesRow;
  activeBatches: number;
  currentStock: number;
  purchases30d: number;
  sales30d: number;
}

export async function dashboardSummary(): Promise<SpeciesSummary[]> {
  const db = await getDb();
  const species = await listSpecies();
  const since = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  return Promise.all(
    species.map(async (sp) => {
      const batchAgg = plainRow<{ cnt: number; stock: number }>(
        (
          await db`
            SELECT COUNT(*)::int as cnt, COALESCE(SUM(current_quantity),0) as stock
            FROM batches WHERE species_id = ${sp.id} AND status = 'active'
          `
        )[0]
      )!;

      const purchaseAgg = plainRow<{ total: number }>(
        (
          await db`
            SELECT COALESCE(SUM(total_amount),0) as total FROM purchases
            WHERE species_id = ${sp.id} AND purchase_date >= ${since}
          `
        )[0]
      )!;

      const saleAgg = plainRow<{ total: number }>(
        (
          await db`
            SELECT COALESCE(SUM(total_amount),0) as total FROM sales
            WHERE species_id = ${sp.id} AND sale_date >= ${since}
          `
        )[0]
      )!;

      return {
        species: sp,
        activeBatches: batchAgg.cnt,
        currentStock: batchAgg.stock,
        purchases30d: purchaseAgg.total,
        sales30d: saleAgg.total,
      };
    })
  );
}

export interface RecentActivityItem {
  kind: "purchase" | "sale";
  id: number;
  date: string;
  item_name: string;
  total_amount: number;
  species_id: number | null;
}

export async function recentActivity(limit = 8): Promise<RecentActivityItem[]> {
  const db = await getDb();
  return plainRows<RecentActivityItem>(
    await db`
      SELECT 'purchase' as kind, id, purchase_date as date, item_name, total_amount, species_id
      FROM purchases
      UNION ALL
      SELECT 'sale' as kind, id, sale_date as date, item_name, total_amount, species_id
      FROM sales
      ORDER BY date DESC, id DESC
      LIMIT ${limit}
    `
  );
}
