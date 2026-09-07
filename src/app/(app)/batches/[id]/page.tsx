import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import {
  getBatch,
  getSpecies,
  listPurchasesByBatch,
  listSalesByBatch,
  listMedicalByBatch,
  getIndividualTrackingSpeciesIds,
  listAnimalsByBatch,
  listAnimalBreeds,
  listAnimalGroups,
} from "@/lib/repo";
import { updateBatchStatusAction, deleteBatchAction } from "@/lib/actions/batches";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import AnimalForm from "@/components/forms/AnimalForm";
import { formatCurrency, formatQuantity } from "@/lib/format";

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
  const canAddAnimal = hasPermission(user, "batches", "create");

  const batch = await getBatch(batchId, user.farm_id);
  if (!batch) notFound();
  const [species, purchases, sales, medical, trackingIds] = await Promise.all([
    getSpecies(batch.species_id),
    listPurchasesByBatch(batchId, user.farm_id),
    listSalesByBatch(batchId, user.farm_id),
    listMedicalByBatch(batchId, user.farm_id),
    getIndividualTrackingSpeciesIds(user.farm_id),
  ]);
  const tracksIndividuals = trackingIds.has(batch.species_id);
  const [animals, breeds, groups] = tracksIndividuals
    ? await Promise.all([
        listAnimalsByBatch(batchId, user.farm_id),
        listAnimalBreeds(user.farm_id, batch.species_id, true),
        listAnimalGroups(user.farm_id, batch.species_id, true),
      ])
    : [[], [], []];

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
                    {t(lang, "common.currency")}{formatCurrency(p.total_amount)}
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
                    {t(lang, "common.currency")}{formatCurrency(s.total_amount)}
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

      {tracksIndividuals && (
        <div className="card space-y-4 p-4">
          <h2 className="font-semibold text-foreground">{t(lang, "animals.title")}</h2>
          {animals.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "animals.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-3 py-2 font-medium">{t(lang, "animals.tag")}</th>
                    <th className="px-3 py-2 font-medium">{t(lang, "animals.name")}</th>
                    <th className="px-3 py-2 font-medium">{t(lang, "animals.sex")}</th>
                    <th className="px-3 py-2 font-medium">{t(lang, "common.status")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t(lang, "animals.latestWeight")}</th>
                  </tr>
                </thead>
                <tbody>
                  {animals.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Link href={`/animals/${a.id}`} className="font-medium text-primary hover:underline">
                          {a.tag}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{a.name || "—"}</td>
                      <td className="px-3 py-2 text-muted">
                        {t(lang, `animals.sex.${a.sex}` as DictKey)}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {t(lang, `animals.status.${a.status}` as DictKey)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {a.latest_weight != null ? formatQuantity(a.latest_weight) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canAddAnimal && (
            <AnimalForm
              lang={lang}
              batchId={batch.id}
              speciesId={batch.species_id}
              breeds={breeds}
              groups={groups}
            />
          )}
        </div>
      )}
    </div>
  );
}
