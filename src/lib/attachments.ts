import "server-only";
import { put, del } from "@vercel/blob";
import { getDb } from "./db";

export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
export const ATTACHMENT_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function uploadAttachmentBlob(
  file: File,
  farmId: number,
  relatedTable: string
): Promise<string> {
  const blob = await put(`farm-${farmId}/${relatedTable}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });
  return blob.url;
}

export async function insertAttachment({
  farmId,
  relatedTable,
  relatedId,
  url,
  filename,
  uploadedBy,
}: {
  farmId: number;
  relatedTable: string;
  relatedId: number;
  url: string;
  filename: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  await db`
    INSERT INTO attachments (farm_id, related_table, related_id, url, filename, uploaded_by)
    VALUES (${farmId}, ${relatedTable}, ${relatedId}, ${url}, ${filename}, ${uploadedBy})
  `;
}

// Called from a record's delete action so a deleted purchase/sale/medical
// record never leaves an orphaned blob file or attachments row behind.
export async function deleteAttachmentsFor(
  farmId: number,
  relatedTable: string,
  relatedId: number
) {
  const db = await getDb();
  const rows = await db`
    SELECT url FROM attachments WHERE farm_id = ${farmId} AND related_table = ${relatedTable} AND related_id = ${relatedId}
  `;
  await db`
    DELETE FROM attachments WHERE farm_id = ${farmId} AND related_table = ${relatedTable} AND related_id = ${relatedId}
  `;
  for (const row of rows as { url: string }[]) {
    try {
      await del(row.url);
    } catch {
      // Best-effort: a failed blob cleanup shouldn't block deleting the record.
    }
  }
}
