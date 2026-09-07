import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import {
  getAnimal,
  getSpecies,
  getBatch,
  listWeightsForAnimal,
  listMedicalByAnimal,
} from "@/lib/repo";
import { updateAnimalStatusAction, deleteAnimalAction } from "@/lib/actions/animals";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import AnimalWeightForm from "@/components/forms/AnimalWeightForm";
import { formatQuantity } from "@/lib/format";

const STATUSES = ["active", "sold", "dead", "culled"] as const;

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const animalId = Number(id);
  const user = await requirePermission("batches", "view");
  const lang = user.language;
  const canEdit = hasPermission(user, "batches", "edit");
  const canDelete = hasPermission(user, "batches", "delete");
  const canAddWeight = hasPermission(user, "batches", "create");

  const animal = await getAnimal(animalId, user.farm_id);
  if (!animal) notFound();
  const [species, batch, weights, medicalRecords] = await Promise.all([
    getSpecies(animal.species_id),
    getBatch(animal.batch_id, user.farm_id),
    listWeightsForAnimal(animalId, user.farm_id),
    listMedicalByAnimal(animalId, user.farm_id),
  ]);

  return (
    <div className="space-y-6">
      {batch && (
        <Link href={`/batches/${batch.id}`} className="text-sm text-primary hover:underline">
          ← {batch.name}
        </Link>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {species?.icon} {animal.tag}
          {animal.name ? ` — ${animal.name}` : ""}
        </h1>
        <p className="text-sm text-muted">
          {species ? (lang === "bn" ? species.name_bn : species.name_en) : ""}
          {animal.breed ? ` · ${animal.breed}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "animals.sex")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, `animals.sex.${animal.sex}` as DictKey)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "animals.birthDate")}</p>
          <p className="text-lg font-semibold text-foreground">{animal.birth_date || "—"}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "common.status")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, `animals.status.${animal.status}` as DictKey)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "animals.latestWeight")}</p>
          <p className="text-lg font-semibold text-foreground">
            {weights[0] ? formatQuantity(weights[0].weight) : "—"}
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold text-foreground">{t(lang, "animals.changeStatus")}</h2>
          <form action={updateAnimalStatusAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="animal_id" value={animal.id} />
            <label className="text-sm">
              <span className="label">{t(lang, "common.status")}</span>
              <select name="status" className="input" defaultValue={animal.status}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(lang, `animals.status.${s}` as DictKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "common.date")}</span>
              <input
                name="status_date"
                type="date"
                defaultValue={animal.status_date ?? ""}
                className="input"
              />
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "common.notes")}</span>
              <input name="status_notes" defaultValue={animal.status_notes ?? ""} className="input" />
            </label>
            <button type="submit" className="btn-secondary">
              {t(lang, "common.save")}
            </button>
          </form>
        </div>
      )}

      <div className="card space-y-4 p-4">
        <h2 className="font-semibold text-foreground">{t(lang, "animals.weightHistory")}</h2>
        {weights.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "animals.noWeights")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {weights.map((w) => (
              <li key={w.id} className="flex justify-between">
                <span className="text-muted">{w.weigh_date}</span>
                <span className="font-medium text-foreground">{formatQuantity(w.weight)}</span>
              </li>
            ))}
          </ul>
        )}
        {canAddWeight && <AnimalWeightForm lang={lang} animalId={animal.id} />}
      </div>

      <div className="card space-y-4 p-4">
        <h2 className="font-semibold text-foreground">{t(lang, "animals.medicalHistory")}</h2>
        {medicalRecords.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "animals.noMedical")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {medicalRecords.map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span className="text-muted">{m.event_date}</span>
                <span className="flex-1 text-foreground">
                  {t(lang, `medical.recordType.${m.record_type}` as DictKey)} — {m.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canDelete && (
        <ConfirmForm
          action={deleteAnimalAction}
          hiddenFields={{ id: animal.id, batch_id: animal.batch_id }}
          confirmMessage={t(lang, "common.confirmDelete")}
        >
          <button type="submit" className="btn-secondary text-sm text-danger">
            {t(lang, "common.delete")}
          </button>
        </ConfirmForm>
      )}
    </div>
  );
}
