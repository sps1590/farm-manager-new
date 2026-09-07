import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import {
  getFinancialSummary,
  getExpenseBreakdown,
  listExpenseCategories,
  getProductionSummary,
} from "@/lib/repo";
import { t } from "@/lib/i18n";
import { categoryLabel, productionTypeLabel } from "@/lib/labels";
import { formatCurrency, formatQuantity } from "@/lib/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const owner = await requireOwner();
  const lang = owner.language;
  const { from, to } = await searchParams;
  const range = from || to ? { from, to } : undefined;

  const [summary, breakdown, categories, production] = await Promise.all([
    getFinancialSummary(owner.farm_id, range),
    getExpenseBreakdown(owner.farm_id, range),
    listExpenseCategories(owner.farm_id),
    getProductionSummary(owner.farm_id, range),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "reports.title")}</h1>
        <p className="text-sm text-muted">{t(lang, "reports.subtitle")}</p>
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="from">
            {t(lang, "reports.from")}
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">
            {t(lang, "reports.to")}
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="input" />
        </div>
        <button type="submit" className="btn-secondary">
          {t(lang, "reports.apply")}
        </button>
        {(from || to) && (
          <Link href="/reports" className="text-sm text-primary hover:underline">
            {t(lang, "reports.clear")}
          </Link>
        )}
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted">{t(lang, "reports.income")}</p>
          <p className="text-lg font-semibold text-primary">
            {t(lang, "common.currency")}
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">{t(lang, "reports.expenses")}</p>
          <p className="text-lg font-semibold text-danger">
            {t(lang, "common.currency")}
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">{t(lang, "reports.payroll")}</p>
          <p className="text-lg font-semibold text-danger">
            {t(lang, "common.currency")}
            {formatCurrency(summary.totalPayroll)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">{t(lang, "reports.netProfit")}</p>
          <p
            className={`text-lg font-semibold ${
              summary.netProfit >= 0 ? "text-primary" : "text-danger"
            }`}
          >
            {t(lang, "common.currency")}
            {formatCurrency(summary.netProfit)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">
          {t(lang, "reports.expenseBreakdown")}
        </h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "reports.noExpenses")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "purchases.category")}</th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "common.totalAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={b.category} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {categoryLabel(b.category, categories, lang)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {t(lang, "common.currency")}
                      {formatCurrency(b.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">
          {t(lang, "production.summary")}
        </h2>
        {production.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "production.noRecords")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "production.productType")}</th>
                  <th className="px-4 py-2 font-medium text-right">{t(lang, "common.quantity")}</th>
                </tr>
              </thead>
              <tbody>
                {production.map((p) => (
                  <tr key={p.product_type} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{productionTypeLabel(p.product_type, lang)}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatQuantity(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-muted">
        {t(lang, "reports.profitShareNote")}{" "}
        <Link href="/partners" className="text-primary hover:underline">
          {t(lang, "nav.partners")}
        </Link>
      </p>
    </div>
  );
}
