import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { listPurchases, listSpecies } from "@/lib/repo";
import { deletePurchaseAction } from "@/lib/actions/purchases";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import { formatCurrency } from "@/lib/format";

export default async function PurchasesPage() {
  const user = await requirePermission("purchases", "view");
  const lang = user.language;
  const purchases = await listPurchases(user.farm_id);
  const species = await listSpecies();
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const canCreate = hasPermission(user, "purchases", "create");
  const canDelete = hasPermission(user, "purchases", "delete");

  const total = purchases.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "purchases.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "purchases.subtitle")}</p>
        </div>
        {canCreate && (
          <Link href="/purchases/new" className="btn-primary">
            + {t(lang, "purchases.new")}
          </Link>
        )}
      </div>

      {purchases.length === 0 ? (
        <p className="text-muted">{t(lang, "purchases.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "purchases.category")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "purchases.itemName")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.species")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "purchases.vendor")}</th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "common.totalAmount")}
                </th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const sp = p.species_id ? speciesById[p.species_id] : undefined;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{p.purchase_date}</td>
                    <td className="px-4 py-2">
                      {t(lang, `purchases.category.${p.category}` as DictKey)}
                    </td>
                    <td className="px-4 py-2">{p.item_name}</td>
                    <td className="px-4 py-2 text-muted">
                      {sp ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted">{p.vendor || "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {t(lang, "common.currency")}{formatCurrency(p.total_amount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canDelete && (
                        <ConfirmForm
                          action={deletePurchaseAction}
                          hiddenFields={{ id: p.id }}
                          confirmMessage={t(lang, "common.confirmDelete")}
                        >
                          <button type="submit" className="text-xs text-danger hover:underline">
                            {t(lang, "common.delete")}
                          </button>
                        </ConfirmForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right font-semibold text-foreground">
                  {t(lang, "common.totalAmount")}
                </td>
                <td className="px-4 py-2 text-right font-bold text-foreground">
                  {t(lang, "common.currency")}{formatCurrency(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
