"use client";

import { useState, useActionState } from "react";
import { createProductionRecordAction } from "@/lib/actions/production";
import type { FormState } from "@/lib/actions/batches";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { AnimalRow, BatchRow, Language, SpeciesRow } from "@/lib/types";

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
  animalsBySpecies,
}: {
  lang: Language;
  species: SpeciesRow[];
  batches: Array<Pick<BatchRow, "id" | "name" | "species_id" | "status">>;
  animalsBySpecies: Record<number, AnimalRow[]>;
}) {
  const [state, formAction] = useActionState(createProductionRecordAction, initialState);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

  const [speciesId, setSpeciesId] = useState("");
  const [customType, setCustomType] = useState(false);
  const [productType, setProductType] = useState("");
  const [milkMode, setMilkMode] = useState<"whole" | "individual">("whole");
  const [amTotal, setAmTotal] = useState("");
  const [noonTotal, setNoonTotal] = useState("");
  const [pmTotal, setPmTotal] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");

  const selectedSpecies = speciesId ? speciesById[Number(speciesId)] : undefined;
  const presetTypes = selectedSpecies
    ? PRODUCTION_TYPES_BY_SPECIES_KEY[selectedSpecies.key]
    : undefined;
  const activeAnimals = speciesId ? animalsBySpecies[Number(speciesId)] ?? [] : [];

  const isMilk = productType === "milk";
  const milkSum = (Number(amTotal) || 0) + (Number(noonTotal) || 0) + (Number(pmTotal) || 0);
  const quantityValue = isMilk ? (milkSum > 0 ? String(milkSum) : "") : manualQuantity;

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div key="species">
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
        <div key="productType">
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
            <input
              id="product_type"
              name="product_type"
              required
              className="input"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
            />
          ) : (
            <select
              id="product_type"
              name="product_type"
              required
              className="input"
              value={productType || presetTypes[0]}
              onChange={(e) => setProductType(e.target.value)}
            >
              {presetTypes.map((tp) => (
                <option key={tp} value={tp}>
                  {t(lang, `production.type.${tp}` as DictKey)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div key="batch">
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
        {isMilk && (
          <div key="milkMode">
            <label className="label">{t(lang, "production.milkMode")}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMilkMode("whole")}
                className={milkMode === "whole" ? "btn-primary" : "btn-secondary"}
              >
                {t(lang, "production.wholeFarm")}
              </button>
              <button
                type="button"
                onClick={() => setMilkMode("individual")}
                className={milkMode === "individual" ? "btn-primary" : "btn-secondary"}
              >
                {t(lang, "production.individualCow")}
              </button>
            </div>
          </div>
        )}
        {isMilk && milkMode === "individual" && activeAnimals.length > 0 && (
          <div key="animal">
            <label className="label" htmlFor="animal_id">
              {t(lang, "production.animal")}
            </label>
            <select id="animal_id" name="animal_id" className="input" defaultValue="">
              <option value="">{t(lang, "common.none")}</option>
              {activeAnimals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag} {a.name ? `— ${a.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {isMilk && (
          <div key="amTotal">
            <label className="label" htmlFor="am_total">
              {t(lang, "production.amTotal")}
            </label>
            <input
              id="am_total"
              name="am_total"
              type="number"
              step="any"
              min="0"
              className="input"
              value={amTotal}
              onChange={(e) => setAmTotal(e.target.value)}
            />
          </div>
        )}
        {isMilk && (
          <div key="noonTotal">
            <label className="label" htmlFor="noon_total">
              {t(lang, "production.noonTotal")}
            </label>
            <input
              id="noon_total"
              name="noon_total"
              type="number"
              step="any"
              min="0"
              className="input"
              value={noonTotal}
              onChange={(e) => setNoonTotal(e.target.value)}
            />
          </div>
        )}
        {isMilk && (
          <div key="pmTotal">
            <label className="label" htmlFor="pm_total">
              {t(lang, "production.pmTotal")}
            </label>
            <input
              id="pm_total"
              name="pm_total"
              type="number"
              step="any"
              min="0"
              className="input"
              value={pmTotal}
              onChange={(e) => setPmTotal(e.target.value)}
            />
          </div>
        )}
        <div key="quantity">
          <label className="label" htmlFor="quantity">
            {t(lang, "common.quantity")}
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            required
            readOnly={isMilk}
            className="input"
            value={quantityValue}
            onChange={isMilk ? undefined : (e) => setManualQuantity(e.target.value)}
          />
          {isMilk && <p className="mt-1 text-xs text-muted">{t(lang, "production.autoSumHint")}</p>}
        </div>
        <div key="unit">
          <label className="label" htmlFor="unit">
            {t(lang, "common.unit")}
          </label>
          <input id="unit" name="unit" className="input" placeholder="L / kg / pcs" />
        </div>
        {isMilk && (
          <div key="consumedQuantity">
            <label className="label" htmlFor="consumed_quantity">
              {t(lang, "production.consumedQuantity")}
            </label>
            <input
              id="consumed_quantity"
              name="consumed_quantity"
              type="number"
              step="any"
              min="0"
              className="input"
            />
            <p className="mt-1 text-xs text-muted">{t(lang, "production.consumedHint")}</p>
          </div>
        )}
        <div key="recordDate">
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
