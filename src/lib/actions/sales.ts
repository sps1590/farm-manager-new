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
  let incomeHead = String(formData.get("income_head") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!itemName || !saleDate) {
    return { error: "Item and date are required." };
  }
  if (!totalAmount || totalAmount <= 0) {
    return { error: "Total amount must be greater than zero." };
  }

  if (incomeHead) {
    const headRows = await db`
      SELECT 1 FROM income_heads WHERE farm_id = ${user.farm_id} AND key = ${incomeHead}
    `;
    if (headRows.length === 0) incomeHead = null;
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
    try {
      attachmentUrl = await uploadAttachmentBlob(attachmentFile, user.farm_id, "sales");
      attachmentFilename = attachmentFile.name;
    } catch (err) {
      return { error: `Attachment upload failed: ${(err as Error).message}` };
    }
  }

  if (!speciesId && batchId) {
    const batchRows = await db`
      SELECT species_id FROM batches WHERE id = ${batchId} AND farm_id = ${user.farm_id}
    `;
    if (batchRows[0]) speciesId = Number(batchRows[0].species_id);
  }

  const inserted = await db`
    INSERT INTO sales
      (farm_id, species_id, batch_id, item_name, quantity, unit, unit_price, total_amount, sale_date, buyer, income_head, notes, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${itemName}, ${quantity}, ${unit}, ${unitPrice}, ${totalAmount}, ${saleDate}, ${buyer}, ${incomeHead}, ${notes}, ${user.id})
    RETURNING id
  `;
  const saleId = (inserted[0] as { id: number }).id;

  if (attachmentUrl && attachmentFilename) {
    await insertAttachment({
      farmId: user.farm_id,
      relatedTable: "sales",
      relatedId: saleId,
      url: attachmentUrl,
      filename: attachmentFilename,
      uploadedBy: user.id,
    });
  }

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "sales",
    recordId: saleId,
    summary: `Recorded sale: ${itemName} (${totalAmount})`,
    after: { itemName, quantity, unitPrice, totalAmount, saleDate, buyer, incomeHead },
  });

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

  const rows = await db`
    SELECT batch_id, quantity, item_name, total_amount FROM sales WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;
  const sale = rows[0] as
    | { batch_id: number | null; quantity: number | null; item_name: string; total_amount: number }
    | undefined;

  await db`DELETE FROM sales WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  await deleteAttachmentsFor(user.farm_id, "sales", id);

  // A sale decreased the linked batch's stock on create -- deleting it
  // must restore that stock, or the batch count silently drifts.
  if (sale?.batch_id && sale.quantity) {
    await db`
      UPDATE batches
      SET current_quantity = current_quantity + ${sale.quantity}, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${sale.batch_id} AND farm_id = ${user.farm_id}
    `;
  }

  if (sale) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "sales",
      recordId: id,
      summary: `Deleted sale: ${sale.item_name} (${sale.total_amount})`,
      before: sale,
    });
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
}
