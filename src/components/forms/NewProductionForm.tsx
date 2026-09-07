"use client";

import { useState, useActionState } from "react";
import { createProductionRecordAction } from "@/lib/actions/production";
import type { FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { BatchRow, Language, SpeciesRow } from "@/lib/types";

const initialState: FormState = {};

// Which production types make sense per species -- keyed by species.key
// (stable, not translated). Species without a preset list still work via
// the "custom" toggle.
const PRODUCTION_TYPES_BY_SPECIES_KEY: Record<string, string[]> = {
  cow: ["milk", "weight"],
  chicken: ["egg", "weight"],
  duck: ["egg", "weight"],
  pigeon_quail: ["egg", "weight"],
  fish: ["weight"],
  vegetable: ["weight"],
};

export default function NewProductionForm({
  lang,
  species,
  batches,
}: {
  lang: Language;
  species: SpeciesRow[];
  batches: Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>;
}) {
  const [state, formAction] = useActionState(createProductionRecordAction, initialState);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

  const [speciesId, setSpeciesId] = useState("");
  const [customType, setCustomType] = useState(false);

  const selectedSpecies = speciesId ? speciesById[Number(speciesId)] : undefined;
  const presetTypes = selectedSpecies
    ? PRODUCTION_TYPES_BY_SPECIES_KEY[selectedSpecies.key]
    : undefined;

  return (
    <form action={formAction} className="card space-y-4 p-6">
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
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="product_type">
              {t(lang, "production.productType")}
            </label>
            <button
              type="button"
              onClick={() => setCustomType((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {customType ? t(lang, "production.usePreset") : t(lang, "production.useCustom")}
            </button>
          </div>
          {customType || !presetTypes ? (
            <input id="product_type" name="product_type" required className="input" />
          ) : (
            <select id="product_type" name="product_type" required className="input" defaultValue={presetTypes[0]}>
              {presetTypes.map((tp) => (
                <option key={tp} value={tp}>
                  {t(lang, `production.type.${tp}` as DictKey)}
                </option>
              ))}
            </select>
          )}
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
          <label className="label" htmlFor="quantity">
            {t(lang, "common.quantity")}
          </label>
          <input id="quantity" name="quantity" type="number" step="any" min="0" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="unit">
            {t(lang, "common.unit")}
          </label>
          <input id="unit" name="unit" className="input" placeholder="L / kg / pcs" />
        </div>
        <div>
          <label className="label" htmlFor="record_date">
            {t(lang, "common.date")} *
          </label>
          <input
            id="record_date"
            name="record_date"
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
