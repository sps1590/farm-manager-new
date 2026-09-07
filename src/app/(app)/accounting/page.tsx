import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { getTrialBalance } from "@/lib/repo";
import { t, type DictKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const owner = await requireOwner();
  const lang = owner.language;
  const { from, to } = await searchParams;
  const range = from || to ? { from, to } : undefined;

  const trialBalance = await getTrialBalance(owner.farm_id, range);
  const totalDebit = trialBalance.reduce((sum, r) => sum + r.totalDebit, 0);
  const totalCredit = trialBalance.reduce((sum, r) => sum + r.totalCredit, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "accounting.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "accounting.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/accounting/accounts" className="btn-secondary">
            {t(lang, "accounting.chartOfAccounts")}
          </Link>
          <Link href="/accounting/journal" className="btn-secondary">
            {t(lang, "accounting.journal")}
          </Link>
        </div>
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
          <Link href="/accounting" className="text-sm text-primary hover:underline">
            {t(lang, "reports.clear")}
          </Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2 font-medium">{t(lang, "accounting.account")}</th>
              <th className="px-4 py-2 font-medium">{t(lang, "accounting.accountType")}</th>
              <th className="px-4 py-2 font-medium text-right">{t(lang, "accounting.debit")}</th>
              <th className="px-4 py-2 font-medium text-right">{t(lang, "accounting.credit")}</th>
              <th className="px-4 py-2 font-medium text-right">{t(lang, "accounting.balance")}</th>
            </tr>
          </thead>
          <tbody>
            {trialBalance.map((row) => (
              <tr key={row.account.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/accounting/accounts/${row.account.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.account.code} {lang === "bn" ? row.account.name_bn : row.account.name_en}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted">
                  {t(lang, `accounting.type.${row.account.type}` as DictKey)}
                </td>
                <td className="px-4 py-2 text-right">
                  {t(lang, "common.currency")}
                  {formatCurrency(row.totalDebit)}
                </td>
                <td className="px-4 py-2 text-right">
                  {t(lang, "common.currency")}
                  {formatCurrency(row.totalCredit)}
                </td>
                <td
                  className={`px-4 py-2 text-right font-semibold ${
                    row.balance < 0 ? "text-danger" : "text-foreground"
                  }`}
                >
                  {t(lang, "common.currency")}
                  {formatCurrency(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="px-4 py-2 text-right font-semibold text-foreground">
                {t(lang, "accounting.totals")}
              </td>
              <td className="px-4 py-2 text-right font-bold text-foreground">
                {t(lang, "common.currency")}
                {formatCurrency(totalDebit)}
              </td>
              <td className="px-4 py-2 text-right font-bold text-foreground">
                {t(lang, "common.currency")}
                {formatCurrency(totalCredit)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted">{t(lang, "accounting.balanceHint")}</p>
    </div>
  );
}
