import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import { getAccount, listLinesForAccount } from "@/lib/repo";
import { t, type DictKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";

const CREDIT_NORMAL = new Set(["liability", "equity", "income"]);

const SOURCE_HREF: Record<string, string> = {
  purchase: "/purchases",
  sale: "/sales",
  salary: "/employees",
  partner: "/partners",
};

export default async function AccountLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accountId = Number(id);
  const owner = await requireOwner();
  const lang = owner.language;

  const account = await getAccount(accountId, owner.farm_id);
  if (!account) notFound();
  const lines = await listLinesForAccount(accountId, owner.farm_id);

  const creditNormal = CREDIT_NORMAL.has(account.type);
  const runningBalances: number[] = [];
  {
    let running = 0;
    for (const line of lines) {
      running += creditNormal ? line.credit - line.debit : line.debit - line.credit;
      runningBalances.push(running);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/accounting" className="text-sm text-primary hover:underline">
        ← {t(lang, "accounting.title")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {account.code} {lang === "bn" ? account.name_bn : account.name_en}
        </h1>
        <p className="text-sm text-muted">{t(lang, `accounting.type.${account.type}` as DictKey)}</p>
      </div>

      {lines.length === 0 ? (
        <p className="text-muted">{t(lang, "accounting.noLines")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "accounting.description")}</th>
                <th className="px-4 py-2 font-medium text-right">{t(lang, "accounting.debit")}</th>
                <th className="px-4 py-2 font-medium text-right">{t(lang, "accounting.credit")}</th>
                <th className="px-4 py-2 font-medium text-right">{t(lang, "accounting.runningBalance")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const href = SOURCE_HREF[line.source];
                return (
                  <tr key={line.lineId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{line.entryDate}</td>
                    <td className="px-4 py-2">
                      {href ? (
                        <Link href={href} className="text-primary hover:underline">
                          {line.description}
                        </Link>
                      ) : (
                        line.description
                      )}
                      {line.memo && <span className="text-muted"> · {line.memo}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {line.debit > 0 ? `${t(lang, "common.currency")}${formatCurrency(line.debit)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {line.credit > 0 ? `${t(lang, "common.currency")}${formatCurrency(line.credit)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {t(lang, "common.currency")}
                      {formatCurrency(runningBalances[i])}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
