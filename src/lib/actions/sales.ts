"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import type { FormState } from "./batches";

export async function createSaleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requirePermission("sales", "create");
  const db = await getDb();

  const itemName = String(formData.get("item_name") ?? "").trim();
  let speciesId = formData.get("species_id")
    ? Number(formData.get("species_id"))
    : null;
  const batchId = formData.get("batch_id")
    ? Number(formData.get("batch_id"))
    : null;
  const quantity = formData.get("quantity")
    ? Number(formData.get("quantity"))
    : null;
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const unitPrice = formData.get("unit_price")
    ? Number(formData.get("unit_price"))
    : null;
  const totalAmount = Number(formData.get("total_amount") ?? 0);
  const saleDate = String(formData.get("sale_date") ?? "");
  const buyer = String(formData.get("buyer") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!itemName || !saleDate) {
    return { error: "Item and date are required." };
  }
  if (!totalAmount || totalAmount <= 0) {
    return { error: "Total amount must be greater than zero." };
  }

  if (!speciesId && batchId) {
    const batchRows = await db`
      SELECT species_id FROM batches WHERE id = ${batchId} AND farm_id = ${user.farm_id}
    `;
    if (batchRows[0]) speciesId = Number(batchRows[0].species_id);
  }

  await db`
    INSERT INTO sales
      (farm_id, species_id, batch_id, item_name, quantity, unit, unit_price, total_amount, sale_date, buyer, notes, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${itemName}, ${quantity}, ${unit}, ${unitPrice}, ${totalAmount}, ${saleDate}, ${buyer}, ${notes}, ${user.id})
  `;

  if (batchId && quantity) {
    await db`
      UPDATE batches
      SET current_quantity = GREATEST(0, current_quantity - ${quantity}), updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${batchId} AND farm_id = ${user.farm_id}
    `;
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
  redirect("/sales");
}

export async function deleteSaleAction(formData: FormData) {
  const user = await requirePermission("sales", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));
  await db`DELETE FROM sales WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}
