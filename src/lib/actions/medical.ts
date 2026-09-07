"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import { logAudit } from "../audit";
import {
  ATTACHMENT_MAX_SIZE,
  ATTACHMENT_ALLOWED_TYPES,
  uploadAttachmentBlob,
  insertAttachment,
  deleteAttachmentsFor,
} from "../attachments";
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

  const attachmentFile = formData.get("attachment");
  let attachmentUrl: string | null = null;
  let attachmentFilename: string | null = null;
  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    if (attachmentFile.size > ATTACHMENT_MAX_SIZE) {
      return { error: "Attachment must be 10MB or smaller." };
    }
    if (!ATTACHMENT_ALLOWED_TYPES.has(attachmentFile.type)) {
      return { error: "Attachment must be an image or PDF." };
    }
    attachmentUrl = await uploadAttachmentBlob(attachmentFile, user.farm_id, "medical_records");
    attachmentFilename = attachmentFile.name;
  }

  const inserted = await db`
    INSERT INTO medical_records
      (farm_id, species_id, batch_id, record_type, title, event_date, next_due_date, quantity_affected, administered_by, cost, notes, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${recordType}, ${title}, ${eventDate}, ${nextDueDate}, ${quantityAffected}, ${administeredBy}, ${cost}, ${notes}, ${user.id})
    RETURNING id
  `;
  const recordId = (inserted[0] as { id: number }).id;

  if (attachmentUrl && attachmentFilename) {
    await insertAttachment({
      farmId: user.farm_id,
      relatedTable: "medical_records",
      relatedId: recordId,
      url: attachmentUrl,
      filename: attachmentFilename,
      uploadedBy: user.id,
    });
  }

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "medical",
    recordId,
    summary: `Recorded ${recordType}: ${title}`,
    after: { recordType, title, eventDate, nextDueDate, quantityAffected, cost },
  });

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

  const rows = await db`
    SELECT batch_id, quantity_affected, record_type, title
    FROM medical_records WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;
  const record = rows[0] as
    | {
        batch_id: number | null;
        quantity_affected: number | null;
        record_type: string;
        title: string;
      }
    | undefined;

  await db`DELETE FROM medical_records WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  await deleteAttachmentsFor(user.farm_id, "medical_records", id);

  // A mortality record decreased the linked batch's stock on create --
  // deleting it must restore that stock, or the batch count silently drifts.
  if (
    record?.record_type === "mortality" &&
    record.batch_id &&
    record.quantity_affected
  ) {
    await db`
      UPDATE batches
      SET current_quantity = current_quantity + ${record.quantity_affected}, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${record.batch_id} AND farm_id = ${user.farm_id}
    `;
  }

  if (record) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "medical",
      recordId: id,
      summary: `Deleted ${record.record_type}: ${record.title}`,
      before: record,
    });
  }

  revalidatePath("/medical");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
}
