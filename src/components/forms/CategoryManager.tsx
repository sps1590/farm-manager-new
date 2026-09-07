"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { CategoryRow, Language } from "@/lib/types";
import type { CategoryFormState } from "@/lib/actions/categories";

const initialState: CategoryFormState = {};

export default function CategoryManager({
  lang,
  categories,
  createAction,
  toggleAction,
}: {
  lang: Language;
  categories: CategoryRow[];
  createAction: (
    prevState: CategoryFormState,
    formData: FormData
  ) => Promise<CategoryFormState>;
  toggleAction: (formData: FormData) => void;
}) {
  const [state, formAction] = useActionState(createAction, initialState);

  return (
    <div className="space-y-3">
      {categories.length > 0 && (
        <ul className="divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span
                className={
                  c.status === "inactive" ? "text-muted line-through" : "text-foreground"
                }
              >
                {lang === "bn" ? c.name_bn : c.name_en}
              </span>
              <form action={toggleAction}>
                <input type="hidden" name="id" value={c.id} />
                <input
                  type="hidden"
                  name="status"
                  value={c.status === "active" ? "inactive" : "active"}
                />
                <button type="submit" className="text-xs text-primary hover:underline">
                  {t(lang, c.status === "active" ? "categories.deactivate" : "categories.activate")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="label">{t(lang, "categories.nameEn")}</span>
          <input name="name_en" required className="input w-40" />
        </label>
        <label className="text-sm">
          <span className="label">{t(lang, "categories.nameBn")}</span>
          <input name="name_bn" required className="input w-40" />
        </label>
        <SubmitButton>{t(lang, "categories.add")}</SubmitButton>
      </form>
      {state?.error && <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>}
    </div>
  );
}
