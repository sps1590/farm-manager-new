import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import {
  getBatch,
  getSpecies,
  listPurchasesByBatch,
  listSalesByBatch,
  listMedicalByBatch,
} from "@/lib/repo";
import { updateBatchStatusAction, deleteBatchAction } from "@/lib/actions/batches";
import { t } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batchId = Number(id);
  const user = await requirePermission("batches", "view");
  const lang = user.language;
  const canEdit = hasPermission(user, "batches", "edit");
  const canDelete = hasPermission(user, "batches", "delete");

  const batch = await getBatch(batchId, user.farm_id);
  if (!batch) notFound();
  const species = await getSpecies(batch.species_id);
  const purchases = await listPurchasesByBatch(batchId, user.farm_id);
  const sales = await listSalesByBatch(batchId, user.farm_id);
  const medical = await listMedicalByBatch(batchId, user.farm_id);

  return (
    <div className="space-y-6">
      <Link href="/batches" className="text-sm text-primary hover:underline">
        ← {t(lang, "common.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {species?.icon} {batch.name}
          </h1>
          <p className="text-sm text-muted">
            {species ? (lang === "bn" ? species.name_bn : species.name_en) : ""}
            {batch.breed ? ` · ${batch.breed}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <form action={updateBatchStatusAction}>
              <input type="hidden" name="id" value={batch.id} />
              <input
                type="hidden"
                name="status"
                value={batch.status === "active" ? "closed" : "active"}
              />
              <button type="submit" className="btn-secondary text-sm">
                {batch.status === "active"
                  ? t(lang, "common.closed")
                  : t(lang, "common.active")}
              </button>
            </form>
          )}
          {canDelete && (
            <ConfirmForm
              action={deleteBatchAction}
              hiddenFields={{ id: batch.id }}
              confirmMessage={t(lang, "common.confirmDelete")}
            >
              <button type="submit" className="btn-secondary text-sm text-danger">
                {t(lang, "common.delete")}
              </button>
            </ConfirmForm>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "batches.currentQuantity")}</p>
          <p className="text-lg font-semibold text-foreground">
            {batch.current_quantity} {species ? (lang === "bn" ? species.unit_bn : species.unit_en) : ""}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "batches.initialQuantity")}</p>
          <p className="text-lg font-semibold text-foreground">{batch.initial_quantity}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "batches.acquiredDate")}</p>
          <p className="text-lg font-semibold text-foreground">{batch.acquired_date || "—"}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "batches.source")}</p>
          <p className="text-lg font-semibold text-foreground">{batch.source || "—"}</p>
        </div>
      </div>

      {batch.notes && (
        <div className="card p-4 text-sm text-foreground">{batch.notes}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-foreground">{t(lang, "purchases.title")}</h2>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "purchases.empty")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {purchases.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.item_name}</span>
                  <span className="text-muted">
                    {t(lang, "common.currency")}{p.total_amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-foreground">{t(lang, "sales.title")}</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "sales.empty")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {sales.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.item_name}</span>
                  <span className="text-primary font-medium">
                    {t(lang, "common.currency")}{s.total_amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-foreground">{t(lang, "medical.title")}</h2>
          {medical.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "medical.empty")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {medical.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>{m.title}</span>
                  <span className="text-muted">{m.event_date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
