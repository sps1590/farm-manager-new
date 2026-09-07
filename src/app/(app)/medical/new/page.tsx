import { requirePermission } from "@/lib/permissions";
import {
  listEnabledSpecies,
  listBatchesForSelect,
  getIndividualTrackingSpeciesIds,
  listActiveAnimalsBySpecies,
} from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewMedicalForm from "@/components/forms/NewMedicalForm";
import type { AnimalRow } from "@/lib/types";

export default async function NewMedicalPage() {
  const user = await requirePermission("medical", "create");
  const lang = user.language;
  const [species, batches, trackingIds] = await Promise.all([
    listEnabledSpecies(user.farm_id),
    listBatchesForSelect(user.farm_id),
    getIndividualTrackingSpeciesIds(user.farm_id),
  ]);

  const animalsBySpecies: Record<number, AnimalRow[]> = {};
  for (const s of species) {
    if (trackingIds.has(s.id)) {
      animalsBySpecies[s.id] = await listActiveAnimalsBySpecies(user.farm_id, s.id);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "medical.new")}</h1>
      <NewMedicalForm lang={lang} species={species} batches={batches} animalsBySpecies={animalsBySpecies} />
    </div>
  );
}
