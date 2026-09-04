import "server-only";
import { getDb } from "./db";
import {
  emptyPermissions,
  type BatchRow,
  type EmployeeRow,
  type FarmRow,
  type FinancialSummary,
  type MedicalRecordRow,
  type PartnerInvestmentRow,
  type PartnerStatus,
  type PartnerSummary,
  type PurchaseRow,
  type SaleRow,
  type SalaryPaymentRow,
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
  const species = await listEnabledSpecies(farmId);
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
  farmId: number
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

  // Profit share Amount is derived from the farm's all-time Net Profit (see
  // getFinancialSummary) and reserve % -- same figures for every partner in
  // this farm, so fetch once rather than per row.
  const [farm, financials] = await Promise.all([
    getFarm(farmId),
    getFinancialSummary(farmId),
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
