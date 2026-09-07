"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { logAudit } from "../audit";
import type { AssetCategory } from "../types";

const CATEGORIES: AssetCategory[] = [
  "vehicle",
  "machinery",
  "equipment",
  "building",
  "tool",
  "other",
];

export interface AssetFormState {
  error?: string;
}

export async function createAssetAction(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category")) as AssetCategory;
  const purchaseDate = String(formData.get("purchase_date") ?? "") || null;
  const cost = formData.get("cost") ? Number(formData.get("cost")) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || name.length < 2) {
    return { error: "assets.error.nameRequired" };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "assets.error.categoryRequired" };
  }

  const inserted = await db`
    INSERT INTO assets (farm_id, name, category, purchase_date, cost, notes, created_by)
    VALUES (${owner.farm_id}, ${name}, ${category}, ${purchaseDate}, ${cost}, ${notes}, ${owner.id})
    RETURNING id
  `;
  const assetId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "assets",
    recordId: assetId,
    summary: `Added asset: ${name}`,
    after: { name, category, purchaseDate, cost },
  });

  revalidatePath("/assets");
  redirect("/assets");
}

export async function updateAssetAction(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category")) as AssetCategory;
  const purchaseDate = String(formData.get("purchase_date") ?? "") || null;
  const cost = formData.get("cost") ? Number(formData.get("cost")) : null;
  const status = String(formData.get("status") ?? "active");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || name.length < 2) {
    return { error: "assets.error.nameRequired" };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "assets.error.categoryRequired" };
  }
  if (status !== "active" && status !== "inactive") {
    return { error: "assets.error.categoryRequired" };
  }

  await db`
    UPDATE assets SET
      name = ${name}, category = ${category}, purchase_date = ${purchaseDate},
      cost = ${cost}, status = ${status}, notes = ${notes}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "assets",
    recordId: id,
    summary: `Updated asset: ${name}`,
    after: { name, category, purchaseDate, cost, status },
  });

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  redirect(`/assets/${id}`);
}

export async function deleteAssetAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const rows = await db`SELECT name FROM assets WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  const asset = rows[0] as { name: string } | undefined;
  await db`DELETE FROM assets WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  if (asset) {
    await logAudit({
      farmId: owner.farm_id,
      userId: owner.id,
      action: "delete",
      module: "assets",
      recordId: id,
      summary: `Deleted asset: ${asset.name}`,
      before: asset,
    });
  }
  revalidatePath("/assets");
  redirect("/assets");
}
