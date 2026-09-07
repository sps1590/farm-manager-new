"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import { logAudit } from "../audit";
import type { FormState } from "./batches";

export async function createProductionRecordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requirePermission("production", "create");
  const db = await getDb();

  let speciesId = formData.get("species_id")
    ? Number(formData.get("species_id"))
    : null;
  const batchId = formData.get("batch_id")
    ? Number(formData.get("batch_id"))
    : null;
  const animalId = formData.get("animal_id") ? Number(formData.get("animal_id")) : null;
  const productType = String(formData.get("product_type") ?? "").trim();
  const recordDate = String(formData.get("record_date") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amTotal = formData.get("am_total") ? Number(formData.get("am_total")) : null;
  const noonTotal = formData.get("noon_total") ? Number(formData.get("noon_total")) : null;
  const pmTotal = formData.get("pm_total") ? Number(formData.get("pm_total")) : null;
  const consumedQuantity = formData.get("consumed_quantity")
    ? Number(formData.get("consumed_quantity"))
    : null;

  if (!productType || !recordDate) {
    return { error: "Product type and date are required." };
  }
  if (!quantity || quantity <= 0) {
    return { error: "Quantity must be greater than zero." };
  }

  if (!speciesId && batchId) {
    const batchRows = await db`
      SELECT species_id FROM batches WHERE id = ${batchId} AND farm_id = ${user.farm_id}
    `;
    if (batchRows[0]) speciesId = Number(batchRows[0].species_id);
  }

  const inserted = await db`
    INSERT INTO production_records
      (farm_id, species_id, batch_id, animal_id, product_type, record_date, quantity, unit, notes,
       am_total, noon_total, pm_total, consumed_quantity, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${animalId}, ${productType}, ${recordDate}, ${quantity}, ${unit}, ${notes},
      ${amTotal}, ${noonTotal}, ${pmTotal}, ${consumedQuantity}, ${user.id})
    RETURNING id
  `;
  const recordId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "production",
    recordId,
    summary: `Recorded production: ${productType} (${quantity})`,
    after: { productType, recordDate, quantity, unit },
  });

  revalidatePath("/production");
  revalidatePath("/reports");
  redirect("/production");
}

export async function deleteProductionRecordAction(formData: FormData) {
  const user = await requirePermission("production", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`
    SELECT product_type, quantity FROM production_records WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;
  const record = rows[0] as { product_type: string; quantity: number } | undefined;

  await db`DELETE FROM production_records WHERE id = ${id} AND farm_id = ${user.farm_id}`;

  if (record) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "production",
      recordId: id,
      summary: `Deleted production record: ${record.product_type} (${record.quantity})`,
      before: record,
    });
  }

  revalidatePath("/production");
  revalidatePath("/reports");
}
