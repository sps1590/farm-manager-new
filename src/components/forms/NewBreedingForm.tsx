"use client";

import { useState, useActionState } from "react";
import {
  createBreedingRecordAction,
  createIncubationAction,
  type BreedingFormState,
} from "@/lib/actions/breeding";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { AnimalRow, BatchRow, Language, SpeciesRow } from "@/lib/types";

const initialState: BreedingFormState = {};

const SPECIES_KIND: Record<string, "mammal" | "poultry"> = {
  cow: "mammal",
  goat_sheep: "mammal",
  duck: "poultry",
  chicken: "poultry",
};
const GESTATION_DAYS: Record<string, number> = { cow: 283, goat_sheep: 150 };
const INCUBATION_DAYS: Record<string, number> = { chicken: 21, duck: 28 };

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NewBreedingForm({
  lang,
  species,
  batches,
  animalsBySpecies,
}: {
  lang: Language;
  species: SpeciesRow[];
  batches: Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>;
  animalsBySpecies: Record<number, AnimalRow[]>;
}) {
  const [mammalState, mammalAction] = useActionState(createBreedingRecordAction, initialState);
  const [poultryState, poultryAction] = useActionState(createIncubationAction, initialState);

  const [speciesId, setSpeciesId] = useState(species[0] ? String(species[0].id) : "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");

  const selected = species.find((s) => String(s.id) === speciesId);
  const kind = selected ? SPECIES_KIND[selected.key] : undefined;
  const speciesBatches = batches.filter((b) => String(b.species_id) === speciesId);
  const activeAnimals = selected ? animalsBySpecies[selected.id] ?? [] : [];

  function onSpeciesChange(id: string) {
    setSpeciesId(id);
    const sp = species.find((s) => String(s.id) === id);
    if (sp) applySuggestedDate(startDate, sp.key);
  }

  function applySuggestedDate(date: string, key: string) {
    if (!date) return;
    if (GESTATION_DAYS[key]) setDueDate(addDays(date, GESTATION_DAYS[key]));
    else if (INCUBATION_DAYS[key]) setDueDate(addDays(date, INCUBATION_DAYS[key]));
  }

  function onStartDateChange(date: string) {
    setStartDate(date);
    if (selected) applySuggestedDate(date, selected.key);
  }

  const speciesSelect = (
    <div>
      <label className="label" htmlFor="species_id">
        {t(lang, "common.species")}
      </label>
      <select
        id="species_id"
        className="input"
        value={speciesId}
        onChange={(e) => onSpeciesChange(e.target.value)}
      >
        {species.map((s) => (
          <option key={s.id} value={s.id}>
            {s.icon} {lang === "bn" ? s.name_bn : s.name_en}
          </option>
        ))}
      </select>
    </div>
  );

  if (species.length === 0) {
    return <p className="text-sm text-muted">{t(lang, "breeding.noSpecies")}</p>;
  }

  if (kind === "mammal") {
    return (
      // key={speciesId} forces a full remount on any species change --
      // without it React reconciles same-position <input> elements across
      // different shapes (poultry vs mammal, or the dam-animal dropdown
      // appearing/disappearing between mammal species) and can leak a
      // controlled field's DOM value into an uncontrolled one it never
      // touches (e.g. start_date -> sire_label).
      <form key={speciesId} action={mammalAction} className="card space-y-4 p-6">
        <input type="hidden" name="species_id" value={speciesId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {speciesSelect}
          <div>
            <label className="label" htmlFor="batch_id">
              {t(lang, "sales.batch")}
            </label>
            <select id="batch_id" name="batch_id" className="input" defaultValue="">
              <option value="">{t(lang, "common.none")}</option>
              {speciesBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          {activeAnimals.length > 0 && (
            <div>
              <label className="label" htmlFor="dam_animal_id">
                {t(lang, "breeding.dam")}
              </label>
              <select id="dam_animal_id" name="dam_animal_id" className="input" defaultValue="">
                <option value="">{t(lang, "common.none")}</option>
                {activeAnimals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag} {a.name ? `— ${a.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="dam_label">
              {t(lang, "breeding.damLabel")}
            </label>
            <input id="dam_label" name="dam_label" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sire_label">
              {t(lang, "breeding.sireLabel")}
            </label>
            <input id="sire_label" name="sire_label" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="method">
              {t(lang, "breeding.method")}
            </label>
            <select id="method" name="method" className="input" defaultValue="natural">
              <option value="natural">{t(lang, "breeding.method.natural")}</option>
              <option value="ai">{t(lang, "breeding.method.ai")}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bred_date">
              {t(lang, "breeding.bredDate")} *
            </label>
            <input
              id="bred_date"
              name="bred_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="expected_due_date">
              {t(lang, "breeding.expectedDueDate")}
            </label>
            <input
              id="expected_due_date"
              name="expected_due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
            <p className="mt-1 text-xs text-muted">{t(lang, "breeding.dueDateHint")}</p>
          </div>
        </div>
        {mammalState?.error && (
          <p className="text-sm text-danger">{t(lang, mammalState.error as DictKey)}</p>
        )}
        <SubmitButton>{t(lang, "common.save")}</SubmitButton>
      </form>
    );
  }

  return (
    <form key={speciesId} action={poultryAction} className="card space-y-4 p-6">
      <input type="hidden" name="species_id" value={speciesId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {speciesSelect}
        <div>
          <label className="label" htmlFor="ibatch_id">
            {t(lang, "sales.batch")}
          </label>
          <select id="ibatch_id" name="batch_id" className="input" defaultValue="">
            <option value="">{t(lang, "common.none")}</option>
            {speciesBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="method2">
            {t(lang, "breeding.incubationMethod")}
          </label>
          <select id="method2" name="method" className="input" defaultValue="broody">
            <option value="broody">{t(lang, "breeding.incubationMethod.broody")}</option>
            <option value="incubator">{t(lang, "breeding.incubationMethod.incubator")}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="egg_count">
            {t(lang, "breeding.eggCount")}
          </label>
          <input id="egg_count" name="egg_count" type="number" min="0" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="start_date">
            {t(lang, "breeding.startDate")} *
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="expected_hatch_date">
            {t(lang, "breeding.expectedHatchDate")}
          </label>
          <input
            id="expected_hatch_date"
            name="expected_hatch_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-muted">{t(lang, "breeding.dueDateHint")}</p>
        </div>
      </div>
      {poultryState?.error && (
        <p className="text-sm text-danger">{t(lang, poultryState.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
