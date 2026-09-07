"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language, MasterDataStatus } from "@/lib/types";
import type { CategoryFormState } from "@/lib/actions/categories";

const initialState: CategoryFormState = {};

export default function MasterDataManager({
  lang,
  items,
  speciesId,
  createAction,
  toggleAction,
  nameLabel,
  addLabel,
}: {
  lang: Language;
  items: Array<{ id: number; name: string; status: MasterDataStatus }>;
  speciesId: number;
  createAction: (
    prevState: CategoryFormState,
    formData: FormData
  ) => Promise<CategoryFormState>;
  toggleAction: (formData: FormData) => void;
  nameLabel: DictKey;
  addLabel: DictKey;
}) {
  const [state, formAction] = useActionState(createAction, initialState);

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-2 text-sm">
              <span
                className={
                  it.status === "inactive" ? "text-muted line-through" : "text-foreground"
                }
              >
                {it.name}
              </span>
              <form action={toggleAction}>
                <input type="hidden" name="id" value={it.id} />
                <input
                  type="hidden"
                  name="status"
                  value={it.status === "active" ? "inactive" : "active"}
                />
                <button type="submit" className="text-xs text-primary hover:underline">
                  {t(lang, it.status === "active" ? "categories.deactivate" : "categories.activate")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="species_id" value={speciesId} />
        <label className="text-sm">
          <span className="label">{t(lang, nameLabel)}</span>
          <input name="name" required className="input w-40" />
        </label>
        <SubmitButton>{t(lang, addLabel)}</SubmitButton>
      </form>
      {state?.error && <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>}
    </div>
  );
}
