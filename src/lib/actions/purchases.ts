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
import { postJournalEntry, reverseJournalEntry, LEDGER_ACCOUNT_KEYS } from "../ledger";
import type { FormState } from "./batches";

export async function createPurchaseAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requirePermission("purchases", "create");
  const db = await getDb();

  const category = String(formData.get("category") ?? "").trim();
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
  const purchaseDate = String(formData.get("purchase_date") ?? "");
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const receiptNumber = String(formData.get("receipt_number") ?? "").trim() || null;

  if (!category || !itemName || !purchaseDate) {
    return { error: "Category, item, and date are required." };
  }
  if (!totalAmount || totalAmount <= 0) {
    return { error: "Total amount must be greater than zero." };
  }

  const categoryRows = await db`
    SELECT 1 FROM expense_categories WHERE farm_id = ${user.farm_id} AND key = ${category}
  `;
  if (categoryRows.length === 0) {
    return { error: "Category, item, and date are required." };
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
      attachmentUrl = await uploadAttachmentBlob(attachmentFile, user.farm_id, "purchases");
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
    INSERT INTO purchases
      (farm_id, species_id, batch_id, category, item_name, quantity, unit, unit_price, total_amount, purchase_date, vendor, notes, receipt_number, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${category}, ${itemName}, ${quantity}, ${unit}, ${unitPrice}, ${totalAmount}, ${purchaseDate}, ${vendor}, ${notes}, ${receiptNumber}, ${user.id})
    RETURNING id
  `;
  const purchaseId = (inserted[0] as { id: number }).id;

  if (attachmentUrl && attachmentFilename) {
    await insertAttachment({
      farmId: user.farm_id,
      relatedTable: "purchases",
      relatedId: purchaseId,
      url: attachmentUrl,
      filename: attachmentFilename,
      uploadedBy: user.id,
    });
  }

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "purchases",
    recordId: purchaseId,
    summary: `Recorded purchase: ${itemName} (${totalAmount})`,
    after: { category, itemName, quantity, unitPrice, totalAmount, purchaseDate, vendor },
  });

  // Buying more animals for an existing batch grows that batch's live stock.
  if (category === "animal" && batchId && quantity) {
    await db`
      UPDATE batches
      SET current_quantity = current_quantity + ${quantity}, updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${batchId} AND farm_id = ${user.farm_id}
    `;
  }

  await postJournalEntry({
    farmId: user.farm_id,
    entryDate: purchaseDate,
    description: `Purchase: ${itemName}`,
    source: "purchase",
    sourceId: purchaseId,
    userId: user.id,
    lines: [
      { accountKey: LEDGER_ACCOUNT_KEYS.OPERATING_EXPENSES, debit: totalAmount, memo: category },
      { accountKey: LEDGER_ACCOUNT_KEYS.CASH, credit: totalAmount },
    ],
  });

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
  revalidatePath("/accounting");
  redirect("/purchases");
}

export async function deletePurchaseAction(formData: FormData) {
  const user = await requirePermission("purchases", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`
    SELECT batch_id, quantity, category, item_name, total_amount FROM purchases WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;
  const purchase = rows[0] as
    | {
        batch_id: number | null;
        quantity: number | null;
        category: string;
        item_name: string;
        total_amount: number;
      }
    | undefined;

  await db`DELETE FROM purchases WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  await deleteAttachmentsFor(user.farm_id, "purchases", id);
  await reverseJournalEntry(user.farm_id, "purchase", id);

  // An "animal" purchase increased the linked batch's stock on create --
  // deleting it must reverse that, or the batch count silently drifts.
  if (purchase?.category === "animal" && purchase.batch_id && purchase.quantity) {
    await db`
      UPDATE batches
      SET current_quantity = GREATEST(0, current_quantity - ${purchase.quantity}), updated_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${purchase.batch_id} AND farm_id = ${user.farm_id}
    `;
  }

  if (purchase) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "purchases",
      recordId: id,
      summary: `Deleted purchase: ${purchase.item_name} (${purchase.total_amount})`,
      before: purchase,
    });
  }

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/batches");
  revalidatePath("/accounting");
}
