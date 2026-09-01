import { getSessionUser } from "@/lib/auth";
import { listSpecies, listBatchesForSelect } from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewSaleForm from "@/components/forms/NewSaleForm";

export default async function NewSalePage() {
  const user = await getSessionUser();
  const lang = user!.language;
  const species = listSpecies();
  const batches = listBatchesForSelect();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "sales.new")}</h1>
      <NewSaleForm lang={lang} species={species} batches={batches} />
    </div>
  );
}
