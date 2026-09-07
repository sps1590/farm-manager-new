"use client";

import { useActionState } from "react";
import { createAnimalAction, type AnimalFormState } from "@/lib/actions/animals";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { AnimalBreedRow, AnimalGroupRow, Language } from "@/lib/types";

const initialState: AnimalFormState = {};
const SEXES = ["unknown", "male", "female"] as const;

export default function AnimalForm({
  lang,
  batchId,
  speciesId,
  breeds,
  groups,
}: {
  lang: Language;
  batchId: number;
  speciesId: number;
  breeds: AnimalBreedRow[];
  groups: AnimalGroupRow[];
}) {
  const [state, formAction] = useActionState(createAnimalAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="species_id" value={speciesId} />
      <label className="text-sm">
        <span className="label">{t(lang, "animals.tag")}</span>
        <input name="tag" required className="input w-28" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "animals.name")}</span>
        <input name="name" className="input w-32" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "animals.sex")}</span>
        <select name="sex" className="input" defaultValue="unknown">
          {SEXES.map((s) => (
            <option key={s} value={s}>
              {t(lang, `animals.sex.${s}` as DictKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "animals.birthDate")}</span>
        <input name="birth_date" type="date" className="input" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "animals.breed")}</span>
        <input name="breed" list="breed-options" className="input w-28" />
        <datalist id="breed-options">
          {breeds.map((b) => (
            <option key={b.id} value={b.name} />
          ))}
        </datalist>
      </label>
      {groups.length > 0 && (
        <label className="text-sm">
          <span className="label">{t(lang, "animals.group")}</span>
          <select name="group_id" className="input" defaultValue="">
            <option value="">{t(lang, "common.none")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <SubmitButton>{t(lang, "animals.add")}</SubmitButton>
      {state?.error && (
        <p className="w-full text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
    </form>
  );
}
