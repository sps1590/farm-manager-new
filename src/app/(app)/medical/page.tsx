import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listMedicalRecords, listSpecies } from "@/lib/repo";
import { deleteMedicalRecordAction } from "@/lib/actions/medical";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";

export default async function MedicalPage() {
  const user = await getSessionUser();
  const lang = user!.language;
  const records = await listMedicalRecords();
  const species = await listSpecies();
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "medical.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "medical.subtitle")}</p>
        </div>
        <Link href="/medical/new" className="btn-primary">
          + {t(lang, "medical.new")}
        </Link>
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
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {records.map((m) => {
                const sp = m.species_id ? speciesById[m.species_id] : undefined;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{m.event_date}</td>
                    <td className="px-4 py-2">
                      {t(lang, `medical.recordType.${m.record_type}` as DictKey)}
                    </td>
                    <td className="px-4 py-2">{m.title}</td>
                    <td className="px-4 py-2 text-muted">
                      {sp ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted">{m.next_due_date || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <ConfirmForm
                        action={deleteMedicalRecordAction}
                        hiddenFields={{ id: m.id }}
                        confirmMessage={t(lang, "common.confirmDelete")}
                      >
                        <button type="submit" className="text-xs text-danger hover:underline">
                          {t(lang, "common.delete")}
                        </button>
                      </ConfirmForm>
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
