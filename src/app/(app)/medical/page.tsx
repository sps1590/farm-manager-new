import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { listMedicalRecords, listSpecies, listAttachmentsFor, listAnimals } from "@/lib/repo";
import { deleteMedicalRecordAction } from "@/lib/actions/medical";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import AttachmentCell from "@/components/forms/AttachmentCell";

export default async function MedicalPage() {
  const user = await requirePermission("medical", "view");
  const lang = user.language;
  const [records, species, animals] = await Promise.all([
    listMedicalRecords(user.farm_id),
    listSpecies(),
    listAnimals(user.farm_id),
  ]);
  const attachments = await listAttachmentsFor(
    user.farm_id,
    "medical_records",
    records.map((r) => r.id)
  );
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const animalsById = Object.fromEntries(animals.map((a) => [a.id, a]));
  const canCreate = hasPermission(user, "medical", "create");
  const canDelete = hasPermission(user, "medical", "delete");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "medical.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "medical.subtitle")}</p>
        </div>
        {canCreate && (
          <Link href="/medical/new" className="btn-primary">
            + {t(lang, "medical.new")}
          </Link>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-muted">{t(lang, "medical.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "medical.recordType")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "medical.recordTitle")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.species")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "medical.nextDueDate")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.attachments")}</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {records.map((m) => {
                const sp = m.species_id ? speciesById[m.species_id] : undefined;
                const animal = m.animal_id ? animalsById[m.animal_id] : undefined;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{m.event_date}</td>
                    <td className="px-4 py-2">
                      {t(lang, `medical.recordType.${m.record_type}` as DictKey)}
                    </td>
                    <td className="px-4 py-2">
                      {m.title}
                      {animal && (
                        <span className="block text-xs text-muted">
                          {t(lang, "medical.animal")}: {animal.tag}
                          {animal.name ? ` — ${animal.name}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {sp ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted">{m.next_due_date || "—"}</td>
                    <td className="px-4 py-2">
                      <AttachmentCell
                        lang={lang}
                        attachments={attachments[m.id]}
                        relatedTable="medical_records"
                        returnPath="/medical"
                        canDelete={canDelete}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canDelete && (
                        <ConfirmForm
                          action={deleteMedicalRecordAction}
                          hiddenFields={{ id: m.id }}
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
