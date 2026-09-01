"use client";

import { useActionState } from "react";
import { createBatchAction, type FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t } from "@/lib/i18n";
import type { Language, SpeciesRow } from "@/lib/types";

const initialState: FormState = {};

export default function NewBatchForm({
  lang,
  species,
}: {
  lang: Language;
  species: SpeciesRow[];
}) {
  const [state, formAction] = useActionState(createBatchAction, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="species_id">
            {t(lang, "common.species")}
          </label>
          <select id="species_id" name="species_id" required className="input">
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {lang === "bn" ? s.name_bn : s.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="name">
            {t(lang, "batches.name")}
          </label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="breed">
            {t(lang, "batches.breed")}
          </label>
          <input id="breed" name="breed" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="source">
            {t(lang, "batches.source")}
          </label>
          <input id="source" name="source" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="acquired_date">
            {t(lang, "batches.acquiredDate")}
          </label>
          <input
            id="acquired_date"
            name="acquired_date"
            type="date"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="initial_quantity">
            {t(lang, "batches.initialQuantity")}
          </label>
          <input
            id="initial_quantity"
            name="initial_quantity"
            type="number"
            step="any"
            min="0"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="unit_cost">
            {t(lang, "batches.unitCost")}
          </label>
          <input
            id="unit_cost"
            name="unit_cost"
            type="number"
            step="any"
            min="0"
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">
          {t(lang, "common.notes")}
        </label>
        <textarea id="notes" name="notes" rows={3} className="input" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
