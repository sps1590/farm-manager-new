import { requirePermission } from "@/lib/permissions";
import { listEnabledSpecies } from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewBatchForm from "@/components/forms/NewBatchForm";

export default async function NewBatchPage() {
  const user = await requirePermission("batches", "create");
  const lang = user.language;
  const species = await listEnabledSpecies(user.farm_id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "batches.new")}</h1>
      <NewBatchForm lang={lang} species={species} />
    </div>
  );
}
