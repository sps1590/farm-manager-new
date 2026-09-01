"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireUser } from "../auth";

export interface FormState {
  error?: string;
}

export async function createBatchAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const db = getDb();

  const speciesId = Number(formData.get("species_id"));
  const name = String(formData.get("name") ?? "").trim();
  const breed = String(formData.get("breed") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const acquiredDate = String(formData.get("acquired_date") ?? "") || null;
  const initialQuantity = Number(formData.get("initial_quantity") ?? 0);
  const unitCost = formData.get("unit_cost")
    ? Number(formData.get("unit_cost"))
    : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!speciesId || !name) {
    return { error: "Species and batch name are required." };
  }

  db.prepare(
    `INSERT INTO batches
      (species_id, name, breed, source, acquired_date, initial_quantity, current_quantity, unit_cost, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    speciesId,
    name,
    breed,
    source,
    acquiredDate,
    initialQuantity,
    initialQuantity,
    unitCost,
    notes,
    user.id
  );

  revalidatePath("/batches");
  revalidatePath("/dashboard");
  redirect("/batches");
}

export async function updateBatchStatusAction(formData: FormData) {
  await requireUser();
  const db = getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (status !== "active" && status !== "closed") return;
  db.prepare(
    "UPDATE batches SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id);
  revalidatePath("/batches");
  revalidatePath(`/batches/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteBatchAction(formData: FormData) {
  await requireUser();
  const db = getDb();
  const id = Number(formData.get("id"));
  db.prepare("DELETE FROM batches WHERE id = ?").run(id);
  revalidatePath("/batches");
  revalidatePath("/dashboard");
  redirect("/batches");
}
