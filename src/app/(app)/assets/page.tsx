import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { listAssets } from "@/lib/repo";
import { t, type DictKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";

export default async function AssetsPage() {
  const owner = await requireOwner();
  const lang = owner.language;
  const assets = await listAssets(owner.farm_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "assets.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "assets.subtitle")}</p>
        </div>
        <Link href="/assets/new" className="btn-primary">
          + {t(lang, "assets.addAsset")}
        </Link>
      </div>

      {assets.length === 0 ? (
        <p className="text-muted">{t(lang, "assets.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "assets.name")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "assets.category")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "assets.purchaseDate")}</th>
                <th className="px-4 py-2 font-medium text-right">{t(lang, "assets.cost")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b border-border last:border-0 ${
                    a.status === "inactive" ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/assets/${a.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {t(lang, `assets.category.${a.category}` as DictKey)}
                  </td>
                  <td className="px-4 py-2 text-muted">{a.purchase_date || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {a.cost != null ? `${t(lang, "common.currency")}${formatCurrency(a.cost)}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/20 text-muted"
                      }`}
                    >
                      {t(lang, a.status === "active" ? "common.active" : "assets.inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
