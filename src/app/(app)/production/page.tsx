import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { listProductionRecords, listSpecies } from "@/lib/repo";
import { deleteProductionRecordAction } from "@/lib/actions/production";
import { t } from "@/lib/i18n";
import { productionTypeLabel } from "@/lib/labels";
import ConfirmForm from "@/components/forms/ConfirmForm";
import { formatQuantity } from "@/lib/format";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requirePermission("production", "view");
  const lang = user.language;
  const { from, to } = await searchParams;
  const range = from || to ? { from, to } : undefined;

  const [records, species] = await Promise.all([
    listProductionRecords(user.farm_id, range),
    listSpecies(),
  ]);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const canCreate = hasPermission(user, "production", "create");
  const canDelete = hasPermission(user, "production", "delete");
  const hasConsumed = records.some((r) => r.consumed_quantity != null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "production.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "production.subtitle")}</p>
        </div>
        {canCreate && (
          <Link href="/production/new" className="btn-primary">
            + {t(lang, "production.new")}
          </Link>
        )}
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
          <Link href="/production" className="text-sm text-primary hover:underline">
            {t(lang, "reports.clear")}
          </Link>
        )}
      </form>

      {records.length === 0 ? (
        <p className="text-muted">{t(lang, "production.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "production.productType")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.species")}</th>
                <th className="px-4 py-2 font-medium text-right">{t(lang, "common.quantity")}</th>
                {hasConsumed && (
                  <th className="px-4 py-2 font-medium text-right">{t(lang, "production.consumed")}</th>
                )}
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const sp = r.species_id ? speciesById[r.species_id] : undefined;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{r.record_date}</td>
                    <td className="px-4 py-2">{productionTypeLabel(r.product_type, lang)}</td>
                    <td className="px-4 py-2 text-muted">
                      {sp ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatQuantity(r.quantity)} {r.unit || ""}
                    </td>
                    {hasConsumed && (
                      <td className="px-4 py-2 text-right text-muted">
                        {r.consumed_quantity != null
                          ? `${formatQuantity(r.consumed_quantity)} ${r.unit || ""}`
                          : "—"}
                      </td>
                    )}
                    <td className="px-4 py-2 text-right">
                      {canDelete && (
                        <ConfirmForm
                          action={deleteProductionRecordAction}
                          hiddenFields={{ id: r.id }}
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
          </table>
        </div>
      )}
    </div>
  );
}
