"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import type { Module } from "../types";

const MODULE_BY_TABLE: Record<string, Module> = {
  purchases: "purchases",
  sales: "sales",
  medical_records: "medical",
};

export async function deleteAttachmentAction(formData: FormData) {
  const relatedTable = String(formData.get("related_table") ?? "");
  const moduleName = MODULE_BY_TABLE[relatedTable];
  if (!moduleName) return;

  const user = await requirePermission(moduleName, "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`
    SELECT url FROM attachments WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;
  const row = rows[0] as { url: string } | undefined;
  if (!row) return;

  await db`DELETE FROM attachments WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  try {
    await del(row.url);
  } catch {
    // Best-effort: a failed blob cleanup shouldn't block removing the reference.
  }

  const returnPath = formData.get("return_path");
  if (typeof returnPath === "string" && returnPath) revalidatePath(returnPath);
}
