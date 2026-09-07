import { requirePermission } from "@/lib/permissions";
import {
  listSpecies,
  getEnabledSpeciesIds,
  getIndividualTrackingSpeciesIds,
  listBatchesForSelect,
  listActiveAnimalsBySpecies,
} from "@/lib/repo";
import { t } from "@/lib/i18n";
import NewBreedingForm from "@/components/forms/NewBreedingForm";
import type { AnimalRow } from "@/lib/types";

const BREEDING_SPECIES_KEYS = ["cow", "goat_sheep", "duck", "chicken"];

export default async function NewBreedingPage() {
  const user = await requirePermission("batches", "create");
  const lang = user.language;

  const [allSpecies, enabledIds, trackingIds, batches] = await Promise.all([
    listSpecies(),
    getEnabledSpeciesIds(user.farm_id),
    getIndividualTrackingSpeciesIds(user.farm_id),
    listBatchesForSelect(user.farm_id),
  ]);

  const species = allSpecies.filter(
    (s) => BREEDING_SPECIES_KEYS.includes(s.key) && enabledIds.has(s.id)
  );

  const animalsBySpecies: Record<number, AnimalRow[]> = {};
  for (const s of species) {
    if (trackingIds.has(s.id)) {
      animalsBySpecies[s.id] = await listActiveAnimalsBySpecies(user.farm_id, s.id);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "breeding.new")}</h1>
      <NewBreedingForm lang={lang} species={species} batches={batches} animalsBySpecies={animalsBySpecies} />
    </div>
  );
}
