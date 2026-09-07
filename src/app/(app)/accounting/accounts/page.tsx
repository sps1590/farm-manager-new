import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { listAccounts } from "@/lib/repo";
import { createAccountAction, toggleAccountStatusAction } from "@/lib/actions/accounting";
import { t, type DictKey } from "@/lib/i18n";
import AccountForm from "@/components/forms/AccountForm";

export default async function ChartOfAccountsPage() {
  const owner = await requireOwner();
  const lang = owner.language;
  const accounts = await listAccounts(owner.farm_id);

  return (
    <div className="space-y-6">
      <Link href="/accounting" className="text-sm text-primary hover:underline">
        ← {t(lang, "accounting.title")}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "accounting.chartOfAccounts")}</h1>
        <p className="text-sm text-muted">{t(lang, "accounting.chartOfAccountsHint")}</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2 font-medium">{t(lang, "accounting.code")}</th>
              <th className="px-4 py-2 font-medium">{t(lang, "accounting.account")}</th>
              <th className="px-4 py-2 font-medium">{t(lang, "accounting.accountType")}</th>
              <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-muted">{a.code}</td>
                <td className={a.status === "inactive" ? "px-4 py-2 text-muted line-through" : "px-4 py-2"}>
                  {lang === "bn" ? a.name_bn : a.name_en}
                </td>
                <td className="px-4 py-2 text-muted">{t(lang, `accounting.type.${a.type}` as DictKey)}</td>
                <td className="px-4 py-2 text-muted">
                  {t(lang, a.status === "active" ? "common.active" : "assets.inactive")}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleAccountStatusAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={a.status === "active" ? "inactive" : "active"}
                    />
                    <button type="submit" className="text-xs text-primary hover:underline">
                      {t(lang, a.status === "active" ? "categories.deactivate" : "categories.activate")}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t(lang, "accounting.addAccount")}</h2>
        <AccountForm lang={lang} action={createAccountAction} />
      </div>
    </div>
  );
}
