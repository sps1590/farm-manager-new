import { requirePermission } from "@/lib/permissions";
import { listEnabledSpecies, listBatchesForSelect } from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewProductionForm from "@/components/forms/NewProductionForm";

export default async function NewProductionPage() {
  const user = await requirePermission("production", "create");
  const lang = user.language;
  const [species, batches] = await Promise.all([
    listEnabledSpecies(user.farm_id),
    listBatchesForSelect(user.farm_id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "production.new")}</h1>
      <NewProductionForm lang={lang} species={species} batches={batches} />
    </div>
  );
}
