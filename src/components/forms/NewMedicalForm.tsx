"use client";

import { useState, useActionState } from "react";
import { createMedicalRecordAction } from "@/lib/actions/medical";
import type { FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { AnimalRow, BatchRow, Language, SpeciesRow } from "@/lib/types";

const initialState: FormState = {};
const TYPES = [
  "vaccination",
  "treatment",
  "checkup",
  "mortality",
  "herd_spraying",
  "deworming",
  "hoof_trimming",
  "tagging",
  "other",
] as const;

export default function NewMedicalForm({
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
  const [state, formAction] = useActionState(createMedicalRecordAction, initialState);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const [speciesId, setSpeciesId] = useState("");
  const activeAnimals = speciesId ? animalsBySpecies[Number(speciesId)] ?? [] : [];

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="record_type">
          {t(lang, "medical.recordType")}
        </label>
        <select id="record_type" name="record_type" required className="input" defaultValue="vaccination">
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {t(lang, `medical.recordType.${tp}` as DictKey)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">{t(lang, "medical.mortalityHint")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">
            {t(lang, "medical.recordTitle")}
          </label>
          <input id="title" name="title" required className="input" />
        </div>
        <div key="species">
          <label className="label" htmlFor="species_id">
            {t(lang, "common.species")}
          </label>
          <select
            id="species_id"
            name="species_id"
            className="input"
            value={speciesId}
            onChange={(e) => setSpeciesId(e.target.value)}
          >
            <option value="">{t(lang, "common.none")}</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {lang === "bn" ? s.name_bn : s.name_en}
              </option>
            ))}
          </select>
        </div>
        <div key="batch">
          <label className="label" htmlFor="batch_id">
            {t(lang, "batches.title")}
          </label>
          <select id="batch_id" name="batch_id" className="input" defaultValue="">
            <option value="">{t(lang, "common.none")}</option>
            {batches.map((b) => {
              const sp = speciesById[b.species_id];
              return (
                <option key={b.id} value={b.id}>
                  {sp?.icon} {b.name}
                </option>
              );
            })}
          </select>
        </div>
        {activeAnimals.length > 0 && (
          // key + the field's own natural remount are not enough on their
          // own -- explicit keys on ALL siblings below are what actually
          // stop React from reconciling by position when this field's
          // presence toggles (see NewBreedingForm.tsx for the bug this
          // prevents: an unkeyed same-tag sibling downstream can silently
          // inherit a previous field's stale uncontrolled DOM value).
          <div key="animal">
            <label className="label" htmlFor="animal_id">
              {t(lang, "medical.animal")}
            </label>
            <select id="animal_id" name="animal_id" className="input" defaultValue="">
              <option value="">{t(lang, "common.none")}</option>
              {activeAnimals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag} {a.name ? `— ${a.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <div key="quantity">
          <label className="label" htmlFor="quantity_affected">
            {t(lang, "medical.quantityAffected")}
          </label>
          <input
            id="quantity_affected"
            name="quantity_affected"
            type="number"
            step="any"
            min="0"
            className="input"
          />
        </div>
        <div key="eventDate">
          <label className="label" htmlFor="event_date">
            {t(lang, "medical.eventDate")} *
          </label>
          <input
            id="event_date"
            name="event_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
        </div>
        <div key="nextDue">
          <label className="label" htmlFor="next_due_date">
            {t(lang, "medical.nextDueDate")}
          </label>
          <input id="next_due_date" name="next_due_date" type="date" className="input" />
        </div>
        <div key="administeredBy">
          <label className="label" htmlFor="administered_by">
            {t(lang, "medical.administeredBy")}
          </label>
          <input id="administered_by" name="administered_by" className="input" />
        </div>
        <div key="cost">
          <label className="label" htmlFor="cost">
            {t(lang, "medical.cost")}
          </label>
          <input id="cost" name="cost" type="number" step="any" min="0" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">
          {t(lang, "common.notes")}
        </label>
        <textarea id="notes" name="notes" rows={2} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="attachment">
          {t(lang, "common.attachment")}
        </label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/*,application/pdf"
          className="input"
        />
        <p className="mt-1 text-xs text-muted">{t(lang, "common.attachmentHint")}</p>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
