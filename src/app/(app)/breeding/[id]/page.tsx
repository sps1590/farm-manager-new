import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { getBreedingRecord, getSpecies } from "@/lib/repo";
import { updateBreedingStatusAction, deleteBreedingRecordAction } from "@/lib/actions/breeding";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";

const STATUSES = ["bred", "confirmed_pregnant", "not_pregnant", "birthed", "lost"] as const;

export default async function BreedingDetailPage({
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

  const record = await getBreedingRecord(recordId, user.farm_id);
  if (!record) notFound();
  const species = await getSpecies(record.species_id);

  return (
    <div className="space-y-6">
      <Link href="/breeding" className="text-sm text-primary hover:underline">
        ← {t(lang, "breeding.title")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {species?.icon} {record.dam_label || `#${record.id}`}
        </h1>
        <p className="text-sm text-muted">
          {species ? (lang === "bn" ? species.name_bn : species.name_en) : ""}
          {record.sire_label ? ` · ${t(lang, "breeding.sireLabel")}: ${record.sire_label}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "breeding.method")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, `breeding.method.${record.method}` as DictKey)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "breeding.bredDate")}</p>
          <p className="text-lg font-semibold text-foreground">{record.bred_date}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "breeding.expectedDueDate")}</p>
          <p className="text-lg font-semibold text-foreground">{record.expected_due_date || "—"}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "common.status")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, `breeding.status.${record.status}` as DictKey)}
          </p>
        </div>
      </div>

      {record.status === "birthed" && (
        <div className="card p-4 text-sm text-foreground">
          {t(lang, "breeding.birthDate")}: {record.birth_date || "—"} ·{" "}
          {t(lang, "breeding.offspringCount")}: {record.offspring_count ?? "—"}
        </div>
      )}

      {canEdit && (
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold text-foreground">{t(lang, "breeding.updateStatus")}</h2>
          <form action={updateBreedingStatusAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={record.id} />
            <label className="text-sm">
              <span className="label">{t(lang, "common.status")}</span>
              <select name="status" className="input" defaultValue={record.status}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(lang, `breeding.status.${s}` as DictKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "breeding.birthDate")}</span>
              <input name="birth_date" type="date" defaultValue={record.birth_date ?? ""} className="input" />
            </label>
            <label className="text-sm">
              <span className="label">{t(lang, "breeding.offspringCount")}</span>
              <input
                name="offspring_count"
                type="number"
                min="0"
                defaultValue={record.offspring_count ?? ""}
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
          <p className="text-xs text-muted">{t(lang, "breeding.birthHint")}</p>
        </div>
      )}

      {canDelete && (
        <ConfirmForm
          action={deleteBreedingRecordAction}
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
