import "server-only";
import { getDb } from "./db";
import {
  emptyPermissions,
  type AssetRow,
  type AttachmentRow,
  type AttendanceRow,
  type AuditLogRow,
  type BatchRow,
  type CategoryRow,
  type EmployeeRow,
  type FarmRow,
  type FinancialSummary,
  type LeaveApplicationRow,
  type MedicalRecordRow,
  type PartnerInvestmentRow,
  type PartnerStatus,
  type PartnerSummary,
  type PurchaseRow,
  type SaleRow,
  type SalaryPaymentRow,
  type AccountRow,
  type AnimalBreedRow,
  type AnimalGroupRow,
  type AnimalRow,
  type AnimalWeightRow,
  type AnimalWithLatestWeight,
  type BreedingRecordRow,
  type IncubationBatchRow,
  type JournalEntryRow,
  type JournalLineRow,
  type ProductionRecordRow,
  type TrialBalanceRow,
  type SpeciesRow,
  type TaskRow,
  type TaskStatus,
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

// Business-type filtering: a farm with no farm_species rows hasn't
// configured this yet, so every species shows (backward compatible for
// every farm that existed before the Farm Profile page did). Once
// configured, only the selected species show -- used for the "new record"
// dropdowns (batches/purchases/sales/medical), never for id-lookup maps on
// list/detail pages, so a record referencing a since-disabled species still
// displays correctly instead of going blank.
export async function listEnabledSpecies(farmId: number): Promise<SpeciesRow[]> {
  const db = await getDb();
  const configured = await db`SELECT 1 FROM farm_species WHERE farm_id = ${farmId} LIMIT 1`;
  if (configured.length === 0) {
    return listSpecies();
  }
  return plainRows<SpeciesRow>(
    await db`
      SELECT s.* FROM species s
      JOIN farm_species fs ON fs.species_id = s.id
      WHERE fs.farm_id = ${farmId}
      ORDER BY s.sort_order
    `
  );
}

export async function getEnabledSpeciesIds(farmId: number): Promise<Set<number>> {
  const enabled = await listEnabledSpecies(farmId);
  return new Set(enabled.map((s) => s.id));
}

export async function getIndividualTrackingSpeciesIds(
  farmId: number
): Promise<Set<number>> {
  const db = await getDb();
  const rows = await db`
    SELECT species_id FROM species_tracking_settings
    WHERE farm_id = ${farmId} AND individual_tracking = true
  `;
  return new Set((rows as { species_id: number }[]).map((r) => r.species_id));
}

export async function listAnimalsByBatch(
  batchId: number,
  farmId: number
): Promise<AnimalWithLatestWeight[]> {
  const db = await getDb();
  return plainRows<AnimalWithLatestWeight>(
    await db`
      SELECT a.*,
        (SELECT weight FROM animal_weights w WHERE w.animal_id = a.id ORDER BY w.weigh_date DESC, w.id DESC LIMIT 1) as latest_weight
      FROM animals a
      WHERE a.batch_id = ${batchId} AND a.farm_id = ${farmId}
      ORDER BY a.created_at DESC
    `
  );
}

export async function getAnimal(
  id: number,
  farmId: number
): Promise<AnimalRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM animals WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<AnimalRow>(rows[0]);
}

export async function listAnimals(farmId: number): Promise<AnimalRow[]> {
  const db = await getDb();
  return plainRows<AnimalRow>(
    await db`SELECT * FROM animals WHERE farm_id = ${farmId} ORDER BY tag`
  );
}

export async function listActiveAnimalsBySpecies(
  farmId: number,
  speciesId: number
): Promise<AnimalRow[]> {
  const db = await getDb();
  return plainRows<AnimalRow>(
    await db`
      SELECT * FROM animals
      WHERE farm_id = ${farmId} AND species_id = ${speciesId} AND status = 'active'
      ORDER BY tag
    `
  );
}

export async function listAnimalBreeds(
  farmId: number,
  speciesId?: number,
  activeOnly = false
): Promise<AnimalBreedRow[]> {
  const db = await getDb();
  const rows = speciesId
    ? activeOnly
      ? await db`SELECT * FROM animal_breeds WHERE farm_id = ${farmId} AND species_id = ${speciesId} AND status = 'active' ORDER BY name`
      : await db`SELECT * FROM animal_breeds WHERE farm_id = ${farmId} AND species_id = ${speciesId} ORDER BY name`
    : await db`SELECT * FROM animal_breeds WHERE farm_id = ${farmId} ORDER BY species_id, name`;
  return plainRows<AnimalBreedRow>(rows);
}

export async function listAnimalGroups(
  farmId: number,
  speciesId?: number,
  activeOnly = false
): Promise<AnimalGroupRow[]> {
  const db = await getDb();
  const rows = speciesId
    ? activeOnly
      ? await db`SELECT * FROM animal_groups WHERE farm_id = ${farmId} AND species_id = ${speciesId} AND status = 'active' ORDER BY name`
      : await db`SELECT * FROM animal_groups WHERE farm_id = ${farmId} AND species_id = ${speciesId} ORDER BY name`
    : await db`SELECT * FROM animal_groups WHERE farm_id = ${farmId} ORDER BY species_id, name`;
  return plainRows<AnimalGroupRow>(rows);
}

export async function listBreedingRecords(farmId: number): Promise<BreedingRecordRow[]> {
  const db = await getDb();
  return plainRows<BreedingRecordRow>(
    await db`SELECT * FROM breeding_records WHERE farm_id = ${farmId} ORDER BY bred_date DESC, id DESC`
  );
}

export async function getBreedingRecord(
  id: number,
  farmId: number
): Promise<BreedingRecordRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM breeding_records WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<BreedingRecordRow>(rows[0]);
}

export async function listIncubationBatches(farmId: number): Promise<IncubationBatchRow[]> {
  const db = await getDb();
  return plainRows<IncubationBatchRow>(
    await db`SELECT * FROM incubation_batches WHERE farm_id = ${farmId} ORDER BY start_date DESC, id DESC`
  );
}

export async function getIncubationBatch(
  id: number,
  farmId: number
): Promise<IncubationBatchRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM incubation_batches WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<IncubationBatchRow>(rows[0]);
}

export interface BreedingAlert {
  key: string;
  kind: "birth" | "hatch";
  label: string;
  dueDate: string;
  href: string;
}

// Unions upcoming expected due-dates (mammal) and expected hatch-dates
// (poultry) into one alert source for the dashboard, same withinDays
// window as listUpcomingTasks/listUpcomingMedical.
export async function listUpcomingBreedingEvents(
  farmId: number,
  withinDays = 7
): Promise<BreedingAlert[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() + withinDays * 86400000)
    .toISOString()
    .slice(0, 10);

  const [dueRows, hatchRows] = await Promise.all([
    db`
      SELECT id, dam_label, expected_due_date FROM breeding_records
      WHERE farm_id = ${farmId} AND status IN ('bred','confirmed_pregnant')
        AND expected_due_date IS NOT NULL AND expected_due_date <= ${cutoff}
      ORDER BY expected_due_date ASC
    `,
    db`
      SELECT id, expected_hatch_date FROM incubation_batches
      WHERE farm_id = ${farmId} AND status = 'incubating'
        AND expected_hatch_date IS NOT NULL AND expected_hatch_date <= ${cutoff}
      ORDER BY expected_hatch_date ASC
    `,
  ]);

  const dueAlerts: BreedingAlert[] = (
    dueRows as { id: number; dam_label: string | null; expected_due_date: string }[]
  ).map((r) => ({
    key: `breeding-${r.id}`,
    kind: "birth",
    label: r.dam_label || `#${r.id}`,
    dueDate: r.expected_due_date,
    href: `/breeding/${r.id}`,
  }));
  const hatchAlerts: BreedingAlert[] = (
    hatchRows as { id: number; expected_hatch_date: string }[]
  ).map((r) => ({
    key: `incubation-${r.id}`,
    kind: "hatch",
    label: `#${r.id}`,
    dueDate: r.expected_hatch_date,
    href: `/breeding/incubation/${r.id}`,
  }));
  return [...dueAlerts, ...hatchAlerts].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function listWeightsForAnimal(
  animalId: number,
  farmId: number
): Promise<AnimalWeightRow[]> {
  const db = await getDb();
  return plainRows<AnimalWeightRow>(
    await db`
      SELECT * FROM animal_weights
      WHERE animal_id = ${animalId} AND farm_id = ${farmId}
      ORDER BY weigh_date DESC, id DESC
    `
  );
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

export async function listMedicalByAnimal(
  animalId: number,
  farmId: number
): Promise<MedicalRecordRow[]> {
  const db = await getDb();
  return plainRows<MedicalRecordRow>(
    await db`SELECT * FROM medical_records WHERE animal_id = ${animalId} AND farm_id = ${farmId} ORDER BY event_date DESC, id DESC`
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

export async function listAttachmentsFor(
  farmId: number,
  relatedTable: string,
  relatedIds: number[]
): Promise<Record<number, AttachmentRow[]>> {
  if (relatedIds.length === 0) return {};
  const db = await getDb();
  const rows = plainRows<AttachmentRow>(
    await db`
      SELECT * FROM attachments
      WHERE farm_id = ${farmId} AND related_table = ${relatedTable} AND related_id = ANY(${relatedIds})
      ORDER BY created_at DESC
    `
  );
  const map: Record<number, AttachmentRow[]> = {};
  for (const row of rows) {
    (map[row.related_id] ??= []).push(row);
  }
  return map;
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

export interface SalaryAlertRow {
  id: number;
  employee_id: number;
  employee_name: string;
  pay_period: string;
  amount: number;
}

// Pending (unpaid) salary payments -- surfaced as a dashboard alert so an
// owner doesn't discover a missed payroll run only when an employee asks.
export async function listPendingSalaryAlerts(
  farmId: number,
  limit = 10
): Promise<SalaryAlertRow[]> {
  const db = await getDb();
  return plainRows<SalaryAlertRow>(
    await db`
      SELECT sp.id, sp.employee_id, e.name as employee_name, sp.pay_period, sp.amount
      FROM salary_payments sp
      JOIN employees e ON e.id = sp.employee_id
      WHERE sp.farm_id = ${farmId} AND sp.status = 'pending'
      ORDER BY sp.pay_period ASC
      LIMIT ${limit}
    `
  );
}

export interface SpeciesSummary {
  species: SpeciesRow;
  activeBatches: number;
  currentStock: number;
  purchasesTotal: number;
  salesTotal: number;
}

export async function dashboardSummary(farmId: number): Promise<SpeciesSummary[]> {
  const db = await getDb();
  const species = await listEnabledSpecies(farmId);

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
            WHERE farm_id = ${farmId} AND species_id = ${sp.id}
          `
        )[0]
      )!;

      const saleAgg = plainRow<{ total: number }>(
        (
          await db`
            SELECT COALESCE(SUM(total_amount),0) as total FROM sales
            WHERE farm_id = ${farmId} AND species_id = ${sp.id}
          `
        )[0]
      )!;

      return {
        species: sp,
        activeBatches: batchAgg.cnt,
        currentStock: batchAgg.stock,
        purchasesTotal: purchaseAgg.total,
        salesTotal: saleAgg.total,
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

export async function getFarm(farmId: number): Promise<FarmRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM farms WHERE id = ${farmId}`;
  return plainRow<FarmRow>(rows[0]);
}

export interface DateRange {
  from?: string;
  to?: string;
}

// Automated P&L: income (sales) minus expenses (purchases, every category
// including utility) minus payroll (paid salary payments). No range = all
// time -- that's what the Partnership page uses to compute each partner's
// profit-share Amount (see fetchPartnerSummaries below). The /reports page
// passes an explicit range for periodic reporting.
export async function getFinancialSummary(
  farmId: number,
  range?: DateRange
): Promise<FinancialSummary> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";

  const incomeRows = await db`
    SELECT COALESCE(SUM(total_amount),0) as total FROM sales
    WHERE farm_id = ${farmId} AND sale_date >= ${from} AND sale_date <= ${to}
  `;
  const expenseRows = await db`
    SELECT COALESCE(SUM(total_amount),0) as total FROM purchases
    WHERE farm_id = ${farmId} AND purchase_date >= ${from} AND purchase_date <= ${to}
  `;
  const payrollRows = await db`
    SELECT COALESCE(SUM(amount),0) as total FROM salary_payments
    WHERE farm_id = ${farmId} AND status = 'paid'
      AND paid_date IS NOT NULL AND paid_date >= ${from} AND paid_date <= ${to}
  `;

  const totalIncome = Number((incomeRows[0] as { total: number }).total);
  const totalExpenses = Number((expenseRows[0] as { total: number }).total);
  const totalPayroll = Number((payrollRows[0] as { total: number }).total);

  return {
    totalIncome,
    totalExpenses,
    totalPayroll,
    netProfit: totalIncome - totalExpenses - totalPayroll,
  };
}

export interface ExpenseCategoryTotal {
  category: string;
  total: number;
}

export async function getExpenseBreakdown(
  farmId: number,
  range?: DateRange
): Promise<ExpenseCategoryTotal[]> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";
  return plainRows<ExpenseCategoryTotal>(
    await db`
      SELECT category, COALESCE(SUM(total_amount),0) as total
      FROM purchases
      WHERE farm_id = ${farmId} AND purchase_date >= ${from} AND purchase_date <= ${to}
      GROUP BY category
      ORDER BY total DESC
    `
  );
}

export async function listProductionRecords(
  farmId: number,
  range?: DateRange
): Promise<ProductionRecordRow[]> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";
  return plainRows<ProductionRecordRow>(
    await db`
      SELECT * FROM production_records
      WHERE farm_id = ${farmId} AND record_date >= ${from} AND record_date <= ${to}
      ORDER BY record_date DESC, id DESC
    `
  );
}

export interface ProductionTypeTotal {
  product_type: string;
  total: number;
}

export async function getProductionSummary(
  farmId: number,
  range?: DateRange
): Promise<ProductionTypeTotal[]> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";
  return plainRows<ProductionTypeTotal>(
    await db`
      SELECT product_type, COALESCE(SUM(quantity),0) as total
      FROM production_records
      WHERE farm_id = ${farmId} AND record_date >= ${from} AND record_date <= ${to}
      GROUP BY product_type
      ORDER BY total DESC
    `
  );
}

export interface LedgerEntry {
  date: string;
  type: "income" | "expense";
  itemName: string;
  category: string | null;
  speciesId: number | null;
  amount: number;
}

// Combined, date-sorted income (sales) + expense (purchases) ledger for the
// Profit/Loss table page. Category is a purchase category for expenses;
// income rows carry speciesId instead so the page can show the species
// icon/name (sales don't have a category field).
export async function listLedgerEntries(
  farmId: number,
  range?: DateRange
): Promise<LedgerEntry[]> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";

  const [salesRows, purchaseRows] = await Promise.all([
    db`
      SELECT sale_date as date, item_name, species_id, total_amount as amount
      FROM sales
      WHERE farm_id = ${farmId} AND sale_date >= ${from} AND sale_date <= ${to}
      ORDER BY sale_date DESC, id DESC
    `,
    db`
      SELECT purchase_date as date, item_name, category, species_id, total_amount as amount
      FROM purchases
      WHERE farm_id = ${farmId} AND purchase_date >= ${from} AND purchase_date <= ${to}
      ORDER BY purchase_date DESC, id DESC
    `,
  ]);

  const entries: LedgerEntry[] = [
    ...salesRows.map((r) => ({
      date: String(r.date),
      type: "income" as const,
      itemName: String(r.item_name),
      category: null,
      speciesId: r.species_id == null ? null : Number(r.species_id),
      amount: Number(r.amount),
    })),
    ...purchaseRows.map((r) => ({
      date: String(r.date),
      type: "expense" as const,
      itemName: String(r.item_name),
      category: String(r.category),
      speciesId: r.species_id == null ? null : Number(r.species_id),
      amount: Number(r.amount),
    })),
  ];

  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return entries;
}

interface RawPartnerRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  profit_share_percent: number;
  profit_share_auto: boolean;
  partner_status: PartnerStatus;
  net_investment: number;
}

// Ownership % is computed here, live, from every partner's net investment --
// never stored. Fetches all partners in the farm (active and inactive, so
// the owner can still see deactivated partners' records) even when only one
// is needed (getPartner) because each partner's % depends on everyone else's
// total; fine at the 14-15 partner scale this is built for.
//
// Deactivated partners are excluded from the ownership % pool entirely --
// the denominator only sums active partners' net investment, so remaining
// active partners' % increases when someone deactivates. Their historical
// ledger stays intact and visible; they just show 0% while inactive.
async function fetchPartnerSummaries(
  db: Awaited<ReturnType<typeof getDb>>,
  farmId: number,
  range?: DateRange
): Promise<PartnerSummary[]> {
  const rows = (await db`
    SELECT u.id, u.name, u.email, u.phone, u.profit_share_percent, u.profit_share_auto, u.partner_status,
      COALESCE(SUM(CASE WHEN pi.entry_type = 'contribution' THEN pi.amount ELSE -pi.amount END), 0) as net_investment
    FROM users u
    LEFT JOIN partner_investments pi ON pi.user_id = u.id
    WHERE u.farm_id = ${farmId} AND u.is_partner = true
    GROUP BY u.id, u.name, u.email, u.phone, u.profit_share_percent, u.profit_share_auto, u.partner_status
    ORDER BY (u.partner_status = 'active') DESC, u.name
  `) as unknown as RawPartnerRow[];

  const total = rows
    .filter((r) => r.partner_status === "active")
    .reduce((sum, r) => sum + Math.max(0, Number(r.net_investment)), 0);

  // Profit share Amount is derived from Net Profit (see getFinancialSummary)
  // and reserve % -- same figures for every partner in this farm, so fetch
  // once rather than per row. No range = all-time (listPartners/getPartner);
  // listPartnerProfitLoss passes an explicit range for the ledger page, but
  // ownership % above is always all-time regardless -- it's a function of
  // cumulative investment, not any one period's results.
  const [farm, financials] = await Promise.all([
    getFarm(farmId),
    getFinancialSummary(farmId, range),
  ]);
  const reservePercent = farm?.profit_reserve_percent ?? 0;
  const distributablePool =
    financials.netProfit * ((100 - reservePercent) / 100);

  return rows.map((r) => {
    const ownershipPercent =
      r.partner_status === "active" && total > 0
        ? (Math.max(0, Number(r.net_investment)) / total) * 100
        : 0;
    const profitShareAuto = Boolean(r.profit_share_auto);
    const profitSharePercent = profitShareAuto
      ? ownershipPercent
      : Number(r.profit_share_percent);

    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      netInvestment: Number(r.net_investment),
      status: r.partner_status,
      ownershipPercent,
      profitShareAuto,
      profitSharePercent,
      profitShareAmount:
        r.partner_status === "active"
          ? distributablePool * (profitSharePercent / 100)
          : 0,
    };
  });
}

export async function listPartners(farmId: number): Promise<PartnerSummary[]> {
  const db = await getDb();
  return fetchPartnerSummaries(db, farmId);
}

// Same per-partner split as listPartners, but the profit-share Amount is
// computed from the given period's Net Profit instead of all-time -- used
// by the Profit/Loss table page's date-range filter.
export async function listPartnerProfitLoss(
  farmId: number,
  range?: DateRange
): Promise<PartnerSummary[]> {
  const db = await getDb();
  return fetchPartnerSummaries(db, farmId, range);
}

export async function getPartner(
  id: number,
  farmId: number
): Promise<PartnerSummary | undefined> {
  const db = await getDb();
  const all = await fetchPartnerSummaries(db, farmId);
  return all.find((p) => p.id === id);
}

export async function listPartnerEntries(
  partnerId: number,
  farmId: number
): Promise<PartnerInvestmentRow[]> {
  const db = await getDb();
  return plainRows<PartnerInvestmentRow>(
    await db`
      SELECT * FROM partner_investments
      WHERE user_id = ${partnerId} AND farm_id = ${farmId}
      ORDER BY entry_date DESC, id DESC
    `
  );
}

export async function listEmployees(farmId: number): Promise<EmployeeRow[]> {
  const db = await getDb();
  return plainRows<EmployeeRow>(
    await db`
      SELECT * FROM employees WHERE farm_id = ${farmId}
      ORDER BY (status = 'active') DESC, name
    `
  );
}

export async function getEmployee(
  id: number,
  farmId: number
): Promise<EmployeeRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM employees WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<EmployeeRow>(rows[0]);
}

export async function listSalaryPayments(
  employeeId: number,
  farmId: number
): Promise<SalaryPaymentRow[]> {
  const db = await getDb();
  return plainRows<SalaryPaymentRow>(
    await db`
      SELECT * FROM salary_payments
      WHERE employee_id = ${employeeId} AND farm_id = ${farmId}
      ORDER BY pay_period DESC, id DESC
    `
  );
}

export async function listAttendance(
  employeeId: number,
  farmId: number,
  limit = 30
): Promise<AttendanceRow[]> {
  const db = await getDb();
  return plainRows<AttendanceRow>(
    await db`
      SELECT * FROM attendance
      WHERE employee_id = ${employeeId} AND farm_id = ${farmId}
      ORDER BY date DESC
      LIMIT ${limit}
    `
  );
}

export async function listLeaveApplications(
  employeeId: number,
  farmId: number
): Promise<LeaveApplicationRow[]> {
  const db = await getDb();
  return plainRows<LeaveApplicationRow>(
    await db`
      SELECT * FROM leave_applications
      WHERE employee_id = ${employeeId} AND farm_id = ${farmId}
      ORDER BY start_date DESC, id DESC
    `
  );
}

export async function listExpenseCategories(
  farmId: number,
  activeOnly = false
): Promise<CategoryRow[]> {
  const db = await getDb();
  return plainRows<CategoryRow>(
    activeOnly
      ? await db`
          SELECT id, key, name_en, name_bn, status, sort_order FROM expense_categories
          WHERE farm_id = ${farmId} AND status = 'active'
          ORDER BY sort_order, id
        `
      : await db`
          SELECT id, key, name_en, name_bn, status, sort_order FROM expense_categories
          WHERE farm_id = ${farmId}
          ORDER BY sort_order, id
        `
  );
}

export async function listIncomeHeads(
  farmId: number,
  activeOnly = false
): Promise<CategoryRow[]> {
  const db = await getDb();
  return plainRows<CategoryRow>(
    activeOnly
      ? await db`
          SELECT id, key, name_en, name_bn, status, sort_order FROM income_heads
          WHERE farm_id = ${farmId} AND status = 'active'
          ORDER BY sort_order, id
        `
      : await db`
          SELECT id, key, name_en, name_bn, status, sort_order FROM income_heads
          WHERE farm_id = ${farmId}
          ORDER BY sort_order, id
        `
  );
}

export async function listAssets(farmId: number): Promise<AssetRow[]> {
  const db = await getDb();
  return plainRows<AssetRow>(
    await db`SELECT * FROM assets WHERE farm_id = ${farmId} ORDER BY created_at DESC, id DESC`
  );
}

export async function getAsset(
  id: number,
  farmId: number
): Promise<AssetRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM assets WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<AssetRow>(rows[0]);
}

export async function listTasks(
  farmId: number,
  status?: TaskStatus
): Promise<TaskRow[]> {
  const db = await getDb();
  const rows = status
    ? await db`
        SELECT t.*, u.name as assigned_to_name FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.farm_id = ${farmId} AND t.status = ${status}
        ORDER BY t.due_date ASC, t.id DESC
      `
    : await db`
        SELECT t.*, u.name as assigned_to_name FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.farm_id = ${farmId}
        ORDER BY t.due_date ASC, t.id DESC
      `;
  return plainRows<TaskRow>(rows);
}

export async function getTask(id: number, farmId: number): Promise<TaskRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM tasks WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<TaskRow>(rows[0]);
}

// Overdue-or-due-soon pending tasks for the dashboard alerts strip. The
// owner sees every such task; anyone else sees only what's assigned to
// them (mirrors the salary-alerts owner-only split, but per-assignee here
// instead of owner-only).
export async function listUpcomingTasks(
  farmId: number,
  userId: number,
  isOwner: boolean,
  withinDays = 7
): Promise<TaskRow[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() + withinDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const rows = isOwner
    ? await db`
        SELECT t.*, u.name as assigned_to_name FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.farm_id = ${farmId} AND t.status = 'pending' AND t.due_date <= ${cutoff}
        ORDER BY t.due_date ASC
      `
    : await db`
        SELECT t.*, u.name as assigned_to_name FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.farm_id = ${farmId} AND t.status = 'pending' AND t.due_date <= ${cutoff}
          AND t.assigned_to = ${userId}
        ORDER BY t.due_date ASC
      `;
  return plainRows<TaskRow>(rows);
}

export async function listAuditLog(
  farmId: number,
  limit = 300
): Promise<AuditLogRow[]> {
  const db = await getDb();
  return plainRows<AuditLogRow>(
    await db`
      SELECT al.id, al.user_id, u.name as user_name, al.action, al.module,
        al.record_id, al.summary, al.created_at
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.farm_id = ${farmId}
      ORDER BY al.id DESC
      LIMIT ${limit}
    `
  );
}

export async function listAccounts(
  farmId: number,
  activeOnly = false
): Promise<AccountRow[]> {
  const db = await getDb();
  const rows = activeOnly
    ? await db`SELECT * FROM accounts WHERE farm_id = ${farmId} AND status = 'active' ORDER BY sort_order, code`
    : await db`SELECT * FROM accounts WHERE farm_id = ${farmId} ORDER BY sort_order, code`;
  return plainRows<AccountRow>(rows);
}

export async function getAccount(id: number, farmId: number): Promise<AccountRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM accounts WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<AccountRow>(rows[0]);
}

export async function listJournalEntries(
  farmId: number,
  range?: DateRange
): Promise<JournalEntryRow[]> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";
  return plainRows<JournalEntryRow>(
    await db`
      SELECT * FROM journal_entries
      WHERE farm_id = ${farmId} AND entry_date >= ${from} AND entry_date <= ${to}
      ORDER BY entry_date DESC, id DESC
    `
  );
}

export async function getJournalEntry(
  id: number,
  farmId: number
): Promise<JournalEntryRow | undefined> {
  const db = await getDb();
  const rows = await db`SELECT * FROM journal_entries WHERE id = ${id} AND farm_id = ${farmId}`;
  return plainRow<JournalEntryRow>(rows[0]);
}

export async function listLinesForEntry(
  journalEntryId: number,
  farmId: number
): Promise<JournalLineRow[]> {
  const db = await getDb();
  return plainRows<JournalLineRow>(
    await db`
      SELECT * FROM journal_lines
      WHERE journal_entry_id = ${journalEntryId} AND farm_id = ${farmId}
      ORDER BY id
    `
  );
}

export interface AccountLedgerLine {
  lineId: number;
  entryId: number;
  entryDate: string;
  description: string;
  source: string;
  sourceId: number | null;
  debit: number;
  credit: number;
  memo: string | null;
}

export async function listLinesForAccount(
  accountId: number,
  farmId: number
): Promise<AccountLedgerLine[]> {
  const db = await getDb();
  const rows = await db`
    SELECT jl.id as line_id, je.id as entry_id, je.entry_date, je.description, je.source, je.source_id,
      jl.debit, jl.credit, jl.memo
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.account_id = ${accountId} AND jl.farm_id = ${farmId}
    ORDER BY je.entry_date ASC, je.id ASC
  `;
  return (
    rows as {
      line_id: number;
      entry_id: number;
      entry_date: string;
      description: string;
      source: string;
      source_id: number | null;
      debit: number;
      credit: number;
      memo: string | null;
    }[]
  ).map((r) => ({
    lineId: r.line_id,
    entryId: r.entry_id,
    entryDate: r.entry_date,
    description: r.description,
    source: r.source,
    sourceId: r.source_id,
    debit: r.debit,
    credit: r.credit,
    memo: r.memo,
  }));
}

const CREDIT_NORMAL_TYPES = new Set(["liability", "equity", "income"]);

export async function getTrialBalance(
  farmId: number,
  range?: DateRange
): Promise<TrialBalanceRow[]> {
  const db = await getDb();
  const from = range?.from ?? "0001-01-01";
  const to = range?.to ?? "9999-12-31";
  const accounts = await listAccounts(farmId);
  const totals = await db`
    SELECT jl.account_id, COALESCE(SUM(jl.debit),0) as total_debit, COALESCE(SUM(jl.credit),0) as total_credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.farm_id = ${farmId} AND je.entry_date >= ${from} AND je.entry_date <= ${to}
    GROUP BY jl.account_id
  `;
  const totalsByAccount = new Map(
    (totals as { account_id: number; total_debit: number; total_credit: number }[]).map((t) => [
      t.account_id,
      t,
    ])
  );

  return accounts.map((account) => {
    const t = totalsByAccount.get(account.id);
    const totalDebit = t?.total_debit ?? 0;
    const totalCredit = t?.total_credit ?? 0;
    const balance = CREDIT_NORMAL_TYPES.has(account.type)
      ? totalCredit - totalDebit
      : totalDebit - totalCredit;
    return { account, totalDebit, totalCredit, balance };
  });
}
