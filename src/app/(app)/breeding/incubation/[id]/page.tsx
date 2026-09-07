import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { getIncubationBatch, getSpecies } from "@/lib/repo";
import { updateIncubationStatusAction, deleteIncubationAction } from "@/lib/actions/breeding";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";

const STATUSES = ["incubating", "hatched", "failed"] as const;

export default async function IncubationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recordId = Number(id);
  const user = await requirePermission("batches", "view");
  const lang = user.language;
  const canEdit = hasPermission(user, "batches", "edit");
  const canDelete = hasPermission(user, "batches", "delete");

  const record = await getIncubationBatch(recordId, user.farm_id);
  if (!record) notFound();
  const species = await getSpecies(record.species_id);

  return (
    <div className="space-y-6">
      <Link href="/breeding" className="text-sm text-primary hover:underline">
        ← {t(lang, "breeding.title")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {species?.icon} #{record.id}
        </h1>
        <p className="text-sm text-muted">
          {species ? (lang === "bn" ? species.name_bn : species.name_en) : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "breeding.incubationMethod")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, `breeding.incubationMethod.${record.method}` as DictKey)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "breeding.eggCount")}</p>
          <p className="text-lg font-semibold text-foreground">{record.egg_count ?? "—"}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "breeding.expectedHatchDate")}</p>
          <p className="text-lg font-semibold text-foreground">{record.expected_hatch_date || "—"}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "common.status")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, `breeding.incubationStatus.${record.status}` as DictKey)}
          </p>
        </div>
      </div>

      {record.status === "hatched" && (
        <div className="card p-4 text-sm text-foreground">
          {t(lang, "breeding.hatchDate")}: {record.hatch_date || "—"} ·{" "}
          {t(lang, "breeding.hatchedCount")}: {record.hatched_count ?? "—"}
        </div>
      )}

      {canEdit && (
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold text-foreground">{t(lang, "breeding.updateStatus")}</h2>
          <form action={updateIncubationStatusAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={record.id} />
            <label className="text-sm">
              <span className="label">{t(lang, "common.status")}</span>
              <select name="status" className="input" defaultValue={record.status}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(lang, `breeding.incubationStatus.${s}` as DictKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "breeding.hatchDate")}</span>
              <input name="hatch_date" type="date" defaultValue={record.hatch_date ?? ""} className="input" />
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "breeding.hatchedCount")}</span>
              <input
                name="hatched_count"
                type="number"
                min="0"
                defaultValue={record.hatched_count ?? ""}
                className="input w-24"
              />
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "common.notes")}</span>
              <input name="notes" defaultValue={record.notes ?? ""} className="input" />
            </label>
            <button type="submit" className="btn-secondary">
              {t(lang, "common.save")}
            </button>
          </form>
          <p className="text-xs text-muted">{t(lang, "breeding.hatchHint")}</p>
        </div>
      )}

      {canDelete && (
        <ConfirmForm
          action={deleteIncubationAction}
          hiddenFields={{ id: record.id }}
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
