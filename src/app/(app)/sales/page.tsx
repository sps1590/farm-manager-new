import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { listSales, listSpecies } from "@/lib/repo";
import { deleteSaleAction } from "@/lib/actions/sales";
import { t } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";

export default async function SalesPage() {
  const user = await requirePermission("sales", "view");
  const lang = user.language;
  const sales = await listSales(user.farm_id);
  const species = await listSpecies();
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const canCreate = hasPermission(user, "sales", "create");
  const canDelete = hasPermission(user, "sales", "delete");

  const total = sales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "sales.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "sales.subtitle")}</p>
        </div>
        {canCreate && (
          <Link href="/sales/new" className="btn-primary">
            + {t(lang, "sales.new")}
          </Link>
        )}
      </div>

      {sales.length === 0 ? (
        <p className="text-muted">{t(lang, "sales.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "sales.itemName")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.species")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "sales.buyer")}</th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "common.totalAmount")}
                </th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const sp = s.species_id ? speciesById[s.species_id] : undefined;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{s.sale_date}</td>
                    <td className="px-4 py-2">{s.item_name}</td>
                    <td className="px-4 py-2 text-muted">
                      {sp ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted">{s.buyer || "—"}</td>
                    <td className="px-4 py-2 text-right font-medium text-primary">
                      {t(lang, "common.currency")}{s.total_amount}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canDelete && (
                        <ConfirmForm
                          action={deleteSaleAction}
                          hiddenFields={{ id: s.id }}
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
                <td colSpan={4} className="px-4 py-2 text-right font-semibold text-foreground">
                  {t(lang, "common.totalAmount")}
                </td>
                <td className="px-4 py-2 text-right font-bold text-primary">
                  {t(lang, "common.currency")}{total}
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
