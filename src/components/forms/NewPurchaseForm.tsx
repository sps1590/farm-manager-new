"use client";

import { useActionState } from "react";
import { createPurchaseAction } from "@/lib/actions/purchases";
import type { FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { BatchRow, Language, SpeciesRow } from "@/lib/types";
import { useAutoTotal } from "@/hooks/useAutoTotal";

const initialState: FormState = {};
const CATEGORIES = ["animal", "feed", "medicine", "utility", "equipment", "other"] as const;

export default function NewPurchaseForm({
  lang,
  species,
  batches,
}: {
  lang: Language;
  species: SpeciesRow[];
  batches: Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>;
}) {
  const [state, formAction] = useActionState(createPurchaseAction, initialState);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const autoTotal = useAutoTotal();

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="category">
          {t(lang, "purchases.category")}
        </label>
        <select id="category" name="category" required className="input" defaultValue="feed">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(lang, `purchases.category.${c}` as DictKey)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">{t(lang, "purchases.animalHint")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="item_name">
            {t(lang, "purchases.itemName")}
          </label>
          <input id="item_name" name="item_name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="species_id">
            {t(lang, "common.species")} ({t(lang, "common.none")})
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
            {t(lang, "purchases.batch")}
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
          <label className="label" htmlFor="vendor">
            {t(lang, "purchases.vendor")}
          </label>
          <input id="vendor" name="vendor" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="quantity">
            {t(lang, "common.quantity")}
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            className="input"
            value={autoTotal.quantity}
            onChange={(e) => autoTotal.onQuantityChange(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="unit">
            {t(lang, "common.unit")}
          </label>
          <input id="unit" name="unit" className="input" placeholder="kg / pcs / bag" />
        </div>
        <div>
          <label className="label" htmlFor="unit_price">
            {t(lang, "common.unitPrice")}
          </label>
          <input
            id="unit_price"
            name="unit_price"
            type="number"
            step="any"
            min="0"
            className="input"
            value={autoTotal.unitPrice}
            onChange={(e) => autoTotal.onUnitPriceChange(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="total_amount">
            {t(lang, "common.totalAmount")} *
          </label>
          <input
            id="total_amount"
            name="total_amount"
            type="number"
            step="any"
            min="0"
            required
            className="input"
            value={autoTotal.total}
            onChange={(e) => autoTotal.onTotalChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">{t(lang, "common.autoCalcHint")}</p>
        </div>
        <div>
          <label className="label" htmlFor="purchase_date">
            {t(lang, "common.date")} *
          </label>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
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
