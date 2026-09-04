"use client";

import { useState, useActionState } from "react";
import { createSaleAction } from "@/lib/actions/sales";
import type { FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { BatchRow, Language, SpeciesRow } from "@/lib/types";

const initialState: FormState = {};

// Sellable product types per species -- e.g. a cow farm sells the cow
// itself, milk, or calves; poultry farms sell the bird (meat) or eggs.
// Keyed by species.key (stable, not translated) so it works regardless of
// display language. Species without a preset list (fish, vegetable) just
// fall back to the plain free-text item field.
const PRODUCT_TYPES_BY_SPECIES_KEY: Record<string, DictKey[]> = {
  cow: ["sales.product.cow", "sales.product.milk", "sales.product.calf"],
  chicken: ["sales.product.chickenMeat", "sales.product.egg"],
  duck: ["sales.product.duckMeat", "sales.product.egg"],
  pigeon_quail: [
    "sales.product.quailMeat",
    "sales.product.pigeonMeat",
    "sales.product.egg",
  ],
};

export default function NewSaleForm({
  lang,
  species,
  batches,
}: {
  lang: Language;
  species: SpeciesRow[];
  batches: Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>;
}) {
  const [state, formAction] = useActionState(createSaleAction, initialState);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

  const [speciesId, setSpeciesId] = useState("");
  const [productType, setProductType] = useState("");
  const [itemName, setItemName] = useState("");

  const selectedSpecies = speciesId ? speciesById[Number(speciesId)] : undefined;
  const productOptions = selectedSpecies
    ? PRODUCT_TYPES_BY_SPECIES_KEY[selectedSpecies.key]
    : undefined;

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <p className="text-xs text-muted">{t(lang, "sales.batchHint")}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="species_id">
            {t(lang, "common.species")}
          </label>
          <select
            id="species_id"
            name="species_id"
            className="input"
            value={speciesId}
            onChange={(e) => {
              setSpeciesId(e.target.value);
              setProductType("");
            }}
          >
            <option value="">{t(lang, "common.none")}</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {lang === "bn" ? s.name_bn : s.name_en}
              </option>
            ))}
          </select>
        </div>
        {productOptions && (
          <div>
            <label className="label" htmlFor="product_type">
              {t(lang, "sales.productType")}
            </label>
            <select
              id="product_type"
              className="input"
              value={productType}
              onChange={(e) => {
                const key = e.target.value;
                setProductType(key);
                if (key) setItemName(t(lang, key as DictKey));
              }}
            >
              <option value="">{t(lang, "sales.productType.custom")}</option>
              {productOptions.map((key) => (
                <option key={key} value={key}>
                  {t(lang, key)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="item_name">
            {t(lang, "sales.itemName")}
          </label>
          <input
            id="item_name"
            name="item_name"
            required
            className="input"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="batch_id">
            {t(lang, "sales.batch")}
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
          <label className="label" htmlFor="buyer">
            {t(lang, "sales.buyer")}
          </label>
          <input id="buyer" name="buyer" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="quantity">
            {t(lang, "common.quantity")}
          </label>
          <input id="quantity" name="quantity" type="number" step="any" min="0" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="unit">
            {t(lang, "common.unit")}
          </label>
          <input id="unit" name="unit" className="input" placeholder="kg / pcs" />
        </div>
        <div>
          <label className="label" htmlFor="unit_price">
            {t(lang, "common.unitPrice")}
          </label>
          <input id="unit_price" name="unit_price" type="number" step="any" min="0" className="input" />
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
          />
        </div>
        <div>
          <label className="label" htmlFor="sale_date">
            {t(lang, "common.date")} *
          </label>
          <input
            id="sale_date"
            name="sale_date"
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
