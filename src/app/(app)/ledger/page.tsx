import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import {
  listLedgerEntries,
  listPartnerProfitLoss,
  listSpecies,
  getFinancialSummary,
} from "@/lib/repo";
import { t, type DictKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const owner = await requireOwner();
  const lang = owner.language;
  const { from, to } = await searchParams;
  const range = from || to ? { from, to } : undefined;

  const [entries, partners, species, summary] = await Promise.all([
    listLedgerEntries(owner.farm_id, range),
    listPartnerProfitLoss(owner.farm_id, range),
    listSpecies(),
    getFinancialSummary(owner.farm_id, range),
  ]);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const activePartners = partners.filter((p) => p.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "ledger.title")}</h1>
        <p className="text-sm text-muted">{t(lang, "ledger.subtitle")}</p>
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
          <Link href="/ledger" className="text-sm text-primary hover:underline">
            {t(lang, "reports.clear")}
          </Link>
        )}
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
        <h2 className="mb-2 font-semibold text-foreground">{t(lang, "ledger.entries")}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "ledger.empty")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "ledger.type")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "purchases.itemName")}</th>
                  <th className="px-4 py-2 font-medium">
                    {t(lang, "ledger.categorySpecies")}
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "common.totalAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const sp = e.speciesId ? speciesById[e.speciesId] : undefined;
                  return (
                    <tr key={`${e.type}-${i}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-muted">{e.date}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            e.type === "income"
                              ? "bg-primary/10 text-primary"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {t(lang, e.type === "income" ? "ledger.type.income" : "ledger.type.expense")}
                        </span>
                      </td>
                      <td className="px-4 py-2">{e.itemName}</td>
                      <td className="px-4 py-2 text-muted">
                        {e.category
                          ? t(lang, `purchases.category.${e.category}` as DictKey)
                          : sp
                            ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}`
                            : "—"}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          e.type === "income" ? "text-primary" : "text-danger"
                        }`}
                      >
                        {e.type === "income" ? "+" : "-"}
                        {t(lang, "common.currency")}
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">{t(lang, "ledger.partnerTable")}</h2>
        <p className="mb-2 text-xs text-muted">{t(lang, "ledger.partnerTableHint")}</p>
        {activePartners.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "partners.empty")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "team.memberName")}</th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "partners.ownershipPercent")}
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "partners.profitSharePercent")}
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "ledger.partnerProfitLoss")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activePartners.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/partners/${p.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">{p.ownershipPercent.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right">{p.profitSharePercent.toFixed(1)}%</td>
                    <td
                      className={`px-4 py-2 text-right font-semibold ${
                        p.profitShareAmount < 0 ? "text-danger" : "text-primary"
                      }`}
                    >
                      {t(lang, "common.currency")}
                      {formatCurrency(p.profitShareAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
