"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireUser } from "../auth";
import type { PurchaseCategory } from "../types";
import type { FormState } from "./batches";

const CATEGORIES: PurchaseCategory[] = [
  "animal",
  "feed",
  "medicine",
  "utility",
  "equipment",
  "other",
];

export async function createPurchaseAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const db = getDb();

  const category = String(formData.get("category")) as PurchaseCategory;
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
  const purchaseDate = String(formData.get("purchase_date") ?? "");
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!CATEGORIES.includes(category) || !itemName || !purchaseDate) {
    return { error: "Category, item, and date are required." };
  }
  if (!totalAmount || totalAmount <= 0) {
    return { error: "Total amount must be greater than zero." };
  }

  db.prepare(
    `INSERT INTO purchases
      (species_id, batch_id, category, item_name, quantity, unit, unit_price, total_amount, purchase_date, vendor, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    speciesId,
    batchId,
    category,
    itemName,
    quantity,
    unit,
    unitPrice,
    totalAmount,
    purchaseDate,
    vendor,
    notes,
    user.id
  );

  // Buying more animals for an existing batch grows that batch's live stock.
  if (category === "animal" && batchId && quantity) {
    db.prepare(
      `UPDATE batches
       SET current_quantity = current_quantity + ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(quantity, batchId);
  }

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
  redirect("/purchases");
}

export async function deletePurchaseAction(formData: FormData) {
  await requireUser();
  const db = getDb();
  const id = Number(formData.get("id"));
  db.prepare("DELETE FROM purchases WHERE id = ?").run(id);
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
}
