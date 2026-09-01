"use client";

import { useActionState } from "react";
import { createMedicalRecordAction } from "@/lib/actions/medical";
import type { FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { BatchRow, Language, SpeciesRow } from "@/lib/types";

const initialState: FormState = {};
const TYPES = ["vaccination", "treatment", "checkup", "mortality"] as const;

export default function NewMedicalForm({
  lang,
  species,
  batches,
}: {
  lang: Language;
  species: SpeciesRow[];
  batches: Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>;
}) {
  const [state, formAction] = useActionState(createMedicalRecordAction, initialState);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

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
        <div>
          <label className="label" htmlFor="species_id">
            {t(lang, "common.species")}
          </label>
          <select id="species_id" name="species_id" className="input" defaultValue="">
            <option value="">{t(lang, "common.none")}</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {lang === "bn" ? s.name_bn : s.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
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
        <div>
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
        <div>
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
        <div>
          <label className="label" htmlFor="next_due_date">
            {t(lang, "medical.nextDueDate")}
          </label>
          <input id="next_due_date" name="next_due_date" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="administered_by">
            {t(lang, "medical.administeredBy")}
          </label>
          <input id="administered_by" name="administered_by" className="input" />
        </div>
        <div>
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
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
