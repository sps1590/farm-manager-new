import { getSessionUser } from "@/lib/auth";
import { listSpecies } from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewBatchForm from "@/components/forms/NewBatchForm";

export default async function NewBatchPage() {
  const user = await getSessionUser();
  const lang = user!.language;
  const species = await listSpecies();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "batches.new")}</h1>
      <NewBatchForm lang={lang} species={species} />
    </div>
  );
}
