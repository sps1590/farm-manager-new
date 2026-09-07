"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { logAudit } from "../audit";

export interface CategoryFormState {
  error?: string;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createExpenseCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const nameEn = String(formData.get("name_en") ?? "").trim();
  const nameBn = String(formData.get("name_bn") ?? "").trim();
  const key = slugify(nameEn);
  if (!nameEn || !nameBn || !key) {
    return { error: "categories.error.nameRequired" };
  }

  const dupe = await db`
    SELECT 1 FROM expense_categories WHERE farm_id = ${owner.farm_id} AND key = ${key}
  `;
  if (dupe.length > 0) {
    return { error: "categories.error.duplicate" };
  }

  const maxOrder = await db`
    SELECT COALESCE(MAX(sort_order), 0) as m FROM expense_categories WHERE farm_id = ${owner.farm_id}
  `;
  const nextOrder = Number((maxOrder[0] as { m: number }).m) + 1;

  const inserted = await db`
    INSERT INTO expense_categories (farm_id, key, name_en, name_bn, sort_order)
    VALUES (${owner.farm_id}, ${key}, ${nameEn}, ${nameBn}, ${nextOrder})
    RETURNING id
  `;
  const categoryId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "expense_categories",
    recordId: categoryId,
    summary: `Added expense category: ${nameEn}`,
    after: { key, nameEn, nameBn },
  });

  revalidatePath("/farm");
  return {};
}

export async function toggleExpenseCategoryStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) === "active" ? "active" : "inactive";

  await db`
    UPDATE expense_categories SET status = ${status}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "expense_categories",
    recordId: id,
    summary: `Expense category set to ${status}`,
    after: { status },
  });

  revalidatePath("/farm");
}

export async function createIncomeHeadAction(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const nameEn = String(formData.get("name_en") ?? "").trim();
  const nameBn = String(formData.get("name_bn") ?? "").trim();
  const key = slugify(nameEn);
  if (!nameEn || !nameBn || !key) {
    return { error: "categories.error.nameRequired" };
  }

  const dupe = await db`
    SELECT 1 FROM income_heads WHERE farm_id = ${owner.farm_id} AND key = ${key}
  `;
  if (dupe.length > 0) {
    return { error: "categories.error.duplicate" };
  }

  const maxOrder = await db`
    SELECT COALESCE(MAX(sort_order), 0) as m FROM income_heads WHERE farm_id = ${owner.farm_id}
  `;
  const nextOrder = Number((maxOrder[0] as { m: number }).m) + 1;

  const inserted = await db`
    INSERT INTO income_heads (farm_id, key, name_en, name_bn, sort_order)
    VALUES (${owner.farm_id}, ${key}, ${nameEn}, ${nameBn}, ${nextOrder})
    RETURNING id
  `;
  const headId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "income_heads",
    recordId: headId,
    summary: `Added income head: ${nameEn}`,
    after: { key, nameEn, nameBn },
  });

  revalidatePath("/farm");
  return {};
}

export async function toggleIncomeHeadStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) === "active" ? "active" : "inactive";

  await db`
    UPDATE income_heads SET status = ${status}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "income_heads",
    recordId: id,
    summary: `Income head set to ${status}`,
    after: { status },
  });

  revalidatePath("/farm");
}
