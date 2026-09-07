"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { AssetRow, Language } from "@/lib/types";
import type { AssetFormState } from "@/lib/actions/assets";

const initialState: AssetFormState = {};
const CATEGORIES = ["vehicle", "machinery", "equipment", "building", "tool", "other"] as const;

export default function AssetForm({
  lang,
  action,
  asset,
}: {
  lang: Language;
  action: (
    prevState: AssetFormState,
    formData: FormData
  ) => Promise<AssetFormState>;
  asset?: AssetRow;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {asset && <input type="hidden" name="id" value={asset.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            {t(lang, "assets.name")}
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={asset?.name}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            {t(lang, "assets.category")}
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={asset?.category ?? "equipment"}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(lang, `assets.category.${c}` as DictKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="purchase_date">
            {t(lang, "assets.purchaseDate")}
          </label>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            defaultValue={asset?.purchase_date ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="cost">
            {t(lang, "assets.cost")}
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            step="any"
            min="0"
            defaultValue={asset?.cost ?? ""}
            className="input"
          />
        </div>
        {asset && (
          <div>
            <label className="label" htmlFor="status">
              {t(lang, "common.status")}
            </label>
            <select
              id="status"
              name="status"
              defaultValue={asset.status}
              className="input"
            >
              <option value="active">{t(lang, "common.active")}</option>
              <option value="inactive">{t(lang, "assets.inactive")}</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="notes">
          {t(lang, "common.notes")}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={asset?.notes ?? ""}
          className="input"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
