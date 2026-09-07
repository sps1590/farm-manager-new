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
