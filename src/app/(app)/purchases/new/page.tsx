import { requirePermission } from "@/lib/permissions";
import { listEnabledSpecies, listBatchesForSelect, listExpenseCategories } from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewPurchaseForm from "@/components/forms/NewPurchaseForm";

export default async function NewPurchasePage() {
  const user = await requirePermission("purchases", "create");
  const lang = user.language;
  const [species, batches, categories] = await Promise.all([
    listEnabledSpecies(user.farm_id),
    listBatchesForSelect(user.farm_id),
    listExpenseCategories(user.farm_id, true),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "purchases.new")}</h1>
      <NewPurchaseForm lang={lang} species={species} batches={batches} categories={categories} />
    </div>
  );
}
