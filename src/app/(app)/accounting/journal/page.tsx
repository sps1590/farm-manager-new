import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { listJournalEntries, listLinesForEntry, listAccounts } from "@/lib/repo";
import { deleteManualJournalEntryAction } from "@/lib/actions/accounting";
import { t, type DictKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";
import ConfirmForm from "@/components/forms/ConfirmForm";
import NewJournalEntryForm from "@/components/forms/NewJournalEntryForm";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const owner = await requireOwner();
  const lang = owner.language;
  const { from, to } = await searchParams;
  const range = from || to ? { from, to } : undefined;

  const [entries, accounts] = await Promise.all([
    listJournalEntries(owner.farm_id, range),
    listAccounts(owner.farm_id, true),
  ]);
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const entryLines = await Promise.all(
    entries.map((e) => listLinesForEntry(e.id, owner.farm_id))
  );

  return (
    <div className="space-y-6">
      <Link href="/accounting" className="text-sm text-primary hover:underline">
        ← {t(lang, "accounting.title")}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "accounting.journal")}</h1>
        <p className="text-sm text-muted">{t(lang, "accounting.journalHint")}</p>
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
          <Link href="/accounting/journal" className="text-sm text-primary hover:underline">
            {t(lang, "reports.clear")}
          </Link>
        )}
      </form>

      {entries.length === 0 ? (
        <p className="text-muted">{t(lang, "accounting.noEntries")}</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={entry.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{entry.description}</p>
                  <p className="text-xs text-muted">
                    {entry.entry_date} · {t(lang, `accounting.source.${entry.source}` as DictKey)}
                  </p>
                </div>
                {entry.source === "manual" && (
                  <ConfirmForm
                    action={deleteManualJournalEntryAction}
                    hiddenFields={{ id: entry.id }}
                    confirmMessage={t(lang, "common.confirmDelete")}
                  >
                    <button type="submit" className="text-xs text-danger hover:underline">
                      {t(lang, "common.delete")}
                    </button>
                  </ConfirmForm>
                )}
              </div>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {entryLines[i].map((line) => {
                    const acct = accountsById[line.account_id];
                    return (
                      <tr key={line.id} className="border-t border-border">
                        <td className="py-1 pr-2 text-muted">
                          {acct ? `${acct.code} ${lang === "bn" ? acct.name_bn : acct.name_en}` : line.account_id}
                          {line.memo ? ` · ${line.memo}` : ""}
                        </td>
                        <td className="py-1 pr-2 text-right w-28">
                          {line.debit > 0 ? `${t(lang, "common.currency")}${formatCurrency(line.debit)}` : ""}
                        </td>
                        <td className="py-1 text-right w-28">
                          {line.credit > 0 ? `${t(lang, "common.currency")}${formatCurrency(line.credit)}` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold text-foreground">{t(lang, "accounting.newEntry")}</h2>
        <NewJournalEntryForm lang={lang} accounts={accounts} />
      </div>
    </div>
  );
}
