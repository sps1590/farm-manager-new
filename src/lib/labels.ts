import { t, type DictKey } from "./i18n";
import type { CategoryRow, Language } from "./types";

// Looks up a farm-configurable expense category / income head's display
// name by its stored key. Falls back to the raw key if it's somehow not
// found (shouldn't happen -- keys are never deleted, only deactivated).
export function categoryLabel(
  key: string,
  categories: CategoryRow[],
  lang: Language
): string {
  const found = categories.find((c) => c.key === key);
  if (!found) return key;
  return lang === "bn" ? found.name_bn : found.name_en;
}

const KNOWN_PRODUCTION_TYPES = new Set(["milk", "egg", "weight"]);

// production_records.product_type isn't farm-configurable master data --
// it's a small, stable set (milk/egg/weight) plus free text when "other"
// was picked. Falls back to the raw string for anything not in the set.
export function productionTypeLabel(productType: string, lang: Language): string {
  if (KNOWN_PRODUCTION_TYPES.has(productType)) {
    return t(lang, `production.type.${productType}` as DictKey);
  }
  return productType;
}
