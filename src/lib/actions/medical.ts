"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import type { MedicalRecordType } from "../types";
import type { FormState } from "./batches";

const TYPES: MedicalRecordType[] = [
  "vaccination",
  "treatment",
  "checkup",
  "mortality",
];

export async function createMedicalRecordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requirePermission("medical", "create");
  const db = await getDb();

  const recordType = String(formData.get("record_type")) as MedicalRecordType;
  const title = String(formData.get("title") ?? "").trim();
  const speciesId = formData.get("species_id")
    ? Number(formData.get("species_id"))
    : null;
  const batchId = formData.get("batch_id")
    ? Number(formData.get("batch_id"))
    : null;
  const eventDate = String(formData.get("event_date") ?? "");
  const nextDueDate = String(formData.get("next_due_date") ?? "") || null;
  const quantityAffected = formData.get("quantity_affected")
    ? Number(formData.get("quantity_affected"))
    : null;
  const administeredBy =
    String(formData.get("administered_by") ?? "").trim() || null;
  const cost = formData.get("cost") ? Number(formData.get("cost")) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!TYPES.includes(recordType) || !title || !eventDate) {
    return { error: "Type, title, and date are required." };
  }

  await db`
    INSERT INTO medical_records
      (farm_id, species_id, batch_id, record_type, title, event_date, next_due_date, quantity_affected, administered_by, cost, notes, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${recordType}, ${title}, ${eventDate}, ${nextDueDate}, ${quantityAffected}, ${administeredBy}, ${cost}, ${notes}, ${user.id})
  `;

  if (recordType === "mortality" && batchId && quantityAffected) {
    await db`
      UPDATE batches
      SET current_quantity = GREATEST(0, current_quantity - ${quantityAffected}), updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${batchId} AND farm_id = ${user.farm_id}
    `;
  }

  revalidatePath("/medical");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
  redirect("/medical");
}

export async function deleteMedicalRecordAction(formData: FormData) {
  const user = await requirePermission("medical", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));
  await db`DELETE FROM medical_records WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  revalidatePath("/medical");
  revalidatePath("/dashboard");
}
