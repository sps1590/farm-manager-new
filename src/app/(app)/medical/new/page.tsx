import { requirePermission } from "@/lib/permissions";
import { listSpecies, listBatchesForSelect } from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewMedicalForm from "@/components/forms/NewMedicalForm";

export default async function NewMedicalPage() {
  const user = await requirePermission("medical", "create");
  const lang = user.language;
  const species = await listSpecies();
  const batches = await listBatchesForSelect(user.farm_id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "medical.new")}</h1>
      <NewMedicalForm lang={lang} species={species} batches={batches} />
    </div>
  );
}
