"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireUser } from "../auth";
import type { FormState } from "./batches";

export async function createSaleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const db = getDb();

  const itemName = String(formData.get("item_name") ?? "").trim();
  const speciesId = formData.get("species_id")
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

  db.prepare(
    `INSERT INTO sales
      (species_id, batch_id, item_name, quantity, unit, unit_price, total_amount, sale_date, buyer, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    speciesId,
    batchId,
    itemName,
    quantity,
    unit,
    unitPrice,
    totalAmount,
    saleDate,
    buyer,
    notes,
    user.id
  );

  if (batchId && quantity) {
    db.prepare(
      `UPDATE batches
       SET current_quantity = MAX(0, current_quantity - ?), updated_at = datetime('now')
       WHERE id = ?`
    ).run(quantity, batchId);
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
  redirect("/sales");
}

export async function deleteSaleAction(formData: FormData) {
  await requireUser();
  const db = getDb();
  const id = Number(formData.get("id"));
  db.prepare("DELETE FROM sales WHERE id = ?").run(id);
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}
