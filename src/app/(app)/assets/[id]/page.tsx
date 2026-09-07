import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import { getAsset } from "@/lib/repo";
import { deleteAssetAction } from "@/lib/actions/assets";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import { formatCurrency } from "@/lib/format";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assetId = Number(id);
  const owner = await requireOwner();
  const lang = owner.language;

  const asset = await getAsset(assetId, owner.farm_id);
  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                asset.status === "active"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/20 text-muted"
              }`}
            >
              {t(lang, asset.status === "active" ? "common.active" : "assets.inactive")}
            </span>
          </div>
          <p className="text-sm text-muted">
            {t(lang, `assets.category.${asset.category}` as DictKey)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/assets/${asset.id}/edit`} className="btn-secondary text-sm">
            {t(lang, "common.edit")}
          </Link>
          <ConfirmForm
            action={deleteAssetAction}
            hiddenFields={{ id: asset.id }}
            confirmMessage={t(lang, "common.confirmDelete")}
          >
            <button type="submit" className="btn-secondary text-sm text-danger">
              {t(lang, "common.delete")}
            </button>
          </ConfirmForm>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "assets.purchaseDate")}</p>
          <p className="text-lg font-semibold text-foreground">
            {asset.purchase_date || "—"}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "assets.cost")}</p>
          <p className="text-lg font-semibold text-foreground">
            {asset.cost != null
              ? `${t(lang, "common.currency")}${formatCurrency(asset.cost)}`
              : "—"}
          </p>
        </div>
      </div>

      {asset.notes && (
        <div className="card p-4 text-sm text-foreground">{asset.notes}</div>
      )}
    </div>
  );
}
