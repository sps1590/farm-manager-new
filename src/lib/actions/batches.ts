"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import { logAudit } from "../audit";

export interface FormState {
  error?: string;
}

export async function createBatchAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requirePermission("batches", "create");
  const db = await getDb();

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

  const inserted = await db`
    INSERT INTO batches
      (farm_id, species_id, name, breed, source, acquired_date, initial_quantity, current_quantity, unit_cost, notes, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${name}, ${breed}, ${source}, ${acquiredDate}, ${initialQuantity}, ${initialQuantity}, ${unitCost}, ${notes}, ${user.id})
    RETURNING id
  `;
  const batchId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "batches",
    recordId: batchId,
    summary: `Created batch: ${name} (${initialQuantity})`,
    after: { speciesId, name, breed, initialQuantity, unitCost },
  });

  revalidatePath("/batches");
  revalidatePath("/dashboard");
  redirect("/batches");
}

export async function updateBatchStatusAction(formData: FormData) {
  const user = await requirePermission("batches", "edit");
  const db = await getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (status !== "active" && status !== "closed") return;
  await db`
    UPDATE batches SET status = ${status}, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;
  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "update",
    module: "batches",
    recordId: id,
    summary: `Batch status set to ${status}`,
    after: { status },
  });
  revalidatePath("/batches");
  revalidatePath(`/batches/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteBatchAction(formData: FormData) {
  const user = await requirePermission("batches", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));
  const rows = await db`SELECT name FROM batches WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  const batch = rows[0] as { name: string } | undefined;
  await db`DELETE FROM batches WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  if (batch) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "batches",
      recordId: id,
      summary: `Deleted batch: ${batch.name}`,
      before: batch,
    });
  }
  revalidatePath("/batches");
  revalidatePath("/dashboard");
  redirect("/batches");
}
