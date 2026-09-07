"use client";

import { useActionState } from "react";
import { addAnimalWeightAction, type AnimalFormState } from "@/lib/actions/animals";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialState: AnimalFormState = {};

export default function AnimalWeightForm({
  lang,
  animalId,
}: {
  lang: Language;
  animalId: number;
}) {
  const [state, formAction] = useActionState(addAnimalWeightAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="animal_id" value={animalId} />
      <label className="text-sm">
        <span className="label">{t(lang, "common.date")}</span>
        <input
          name="weigh_date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="input"
        />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "animals.weight")}</span>
        <input name="weight" type="number" step="any" min="0" required className="input w-28" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "common.notes")}</span>
        <input name="notes" className="input" />
      </label>
      <SubmitButton>{t(lang, "animals.addWeight")}</SubmitButton>
      {state?.error && (
        <p className="w-full text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
    </form>
  );
}
