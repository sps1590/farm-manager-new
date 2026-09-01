import "server-only";
import { getDb } from "./db";
import {
  emptyPermissions,
  type BatchRow,
  type MedicalRecordRow,
  type PurchaseRow,
  type SaleRow,
  type SpeciesRow,
  type TeamMemberRow,
} from "./types";

// Read-only query helpers shared by server components (dashboard, list pages).
// Mutations live in src/lib/actions/*.ts as "use server" form actions.
//
// Every farm-data query here takes the caller's farmId (always from the
// session user, never from client input) and filters by it -- this is the
// multi-tenant data-isolation boundary. `species` is shared reference data
// and intentionally not farm-scoped.

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

export async function listBatches(
  farmId: number,
  speciesId?: number
): Promise<BatchRow[]> {
  const db = await getDb();
  if (speciesId) {
    return plainRows<BatchRow>(
      await db`SELECT * FROM batches WHERE farm_id = ${farmId} AND species_id = ${speciesId} ORDER BY created_at DESC`
    );
  }
  return plainRows<BatchRow>(
    await db`SELECT * FROM batches WHERE farm_id = ${farmId} ORDER BY created_at DESC`
  );
}

export async function getBatch(
  id: number,
  farmId: number
): Promise<BatchRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM batches WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<BatchRow>(rows[0]);
}

export async function listBatchesForSelect(
  farmId: number
): Promise<Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>> {
  const db = await getDb();
  return plainRows<Pick<BatchRow, "id" | "name" | "species_id" | "status">>(
    await db`SELECT id, name, species_id, status FROM batches WHERE farm_id = ${farmId} AND status = 'active' ORDER BY name`
  );
}

export async function listPurchasesByBatch(
  batchId: number,
  farmId: number
): Promise<PurchaseRow[]> {
  const db = await getDb();
  return plainRows<PurchaseRow>(
    await db`SELECT * FROM purchases WHERE batch_id = ${batchId} AND farm_id = ${farmId} ORDER BY purchase_date DESC, id DESC`
  );
}

export async function listSalesByBatch(
  batchId: number,
  farmId: number
): Promise<SaleRow[]> {
  const db = await getDb();
  return plainRows<SaleRow>(
    await db`SELECT * FROM sales WHERE batch_id = ${batchId} AND farm_id = ${farmId} ORDER BY sale_date DESC, id DESC`
  );
}

export async function listMedicalByBatch(
  batchId: number,
  farmId: number
): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  return plainRows<MedicalRecordRow>(
    await db`SELECT * FROM medical_records WHERE batch_id = ${batchId} AND farm_id = ${farmId} ORDER BY event_date DESC, id DESC`
  );
}

export async function listPurchases(
  farmId: number,
  limit = 200
): Promise<PurchaseRow[]> {
  const db = await getDb();
  return plainRows<PurchaseRow>(
    await db`SELECT * FROM purchases WHERE farm_id = ${farmId} ORDER BY purchase_date DESC, id DESC LIMIT ${limit}`
  );
}

export async function listSales(farmId: number, limit = 200): Promise<SaleRow[]> {
  const db = await getDb();
  return plainRows<SaleRow>(
    await db`SELECT * FROM sales WHERE farm_id = ${farmId} ORDER BY sale_date DESC, id DESC LIMIT ${limit}`
  );
}

export async function listMedicalRecords(
  farmId: number,
  limit = 200
): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  return plainRows<MedicalRecordRow>(
    await db`SELECT * FROM medical_records WHERE farm_id = ${farmId} ORDER BY event_date DESC, id DESC LIMIT ${limit}`
  );
}

export async function listUpcomingMedical(
  farmId: number,
  withinDays = 14
): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() + withinDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return plainRows<MedicalRecordRow>(
    await db`
      SELECT * FROM medical_records
      WHERE farm_id = ${farmId}
        AND next_due_date IS NOT NULL AND next_due_date != ''
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

export async function dashboardSummary(farmId: number): Promise<SpeciesSummary[]> {
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
            FROM batches WHERE farm_id = ${farmId} AND species_id = ${sp.id} AND status = 'active'
          `
        )[0]
      )!;

      const purchaseAgg = plainRow<{ total: number }>(
        (
          await db`
            SELECT COALESCE(SUM(total_amount),0) as total FROM purchases
            WHERE farm_id = ${farmId} AND species_id = ${sp.id} AND purchase_date >= ${since}
          `
        )[0]
      )!;

      const saleAgg = plainRow<{ total: number }>(
        (
          await db`
            SELECT COALESCE(SUM(total_amount),0) as total FROM sales
            WHERE farm_id = ${farmId} AND species_id = ${sp.id} AND sale_date >= ${since}
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

export async function recentActivity(
  farmId: number,
  limit = 8
): Promise<RecentActivityItem[]> {
  const db = await getDb();
  return plainRows<RecentActivityItem>(
    await db`
      SELECT 'purchase' as kind, id, purchase_date as date, item_name, total_amount, species_id
      FROM purchases WHERE farm_id = ${farmId}
      UNION ALL
      SELECT 'sale' as kind, id, sale_date as date, item_name, total_amount, species_id
      FROM sales WHERE farm_id = ${farmId}
      ORDER BY date DESC, id DESC
      LIMIT ${limit}
    `
  );
}

async function loadPermissionsFor(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number
) {
  const rows = await db`
    SELECT module, can_view, can_create, can_edit, can_delete
    FROM user_permissions WHERE user_id = ${userId}
  `;
  const permissions = emptyPermissions();
  for (const r of rows as unknown as Array<{
    module: keyof typeof permissions;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>) {
    permissions[r.module] = {
      view: r.can_view,
      create: r.can_create,
      edit: r.can_edit,
      delete: r.can_delete,
    };
  }
  return permissions;
}

export async function listTeamMembers(farmId: number): Promise<TeamMemberRow[]> {
  const db = await getDb();
  const rows = await db`
    SELECT id, name, email, phone, username, role
    FROM users WHERE farm_id = ${farmId} ORDER BY (role = 'owner') DESC, name
  `;
  return Promise.all(
    (rows as unknown as Omit<TeamMemberRow, "permissions">[]).map(async (row) => ({
      ...row,
      permissions: await loadPermissionsFor(db, row.id),
    }))
  );
}

export async function getTeamMember(
  id: number,
  farmId: number
): Promise<TeamMemberRow | undefined> {
  const db = await getDb();
  const rows = await db`
    SELECT id, name, email, phone, username, role
    FROM users WHERE id = ${id} AND farm_id = ${farmId}
  `;
  const row = rows[0] as Omit<TeamMemberRow, "permissions"> | undefined;
  if (!row) return undefined;
  return { ...row, permissions: await loadPermissionsFor(db, row.id) };
}
