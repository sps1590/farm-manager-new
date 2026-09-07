"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { logAudit } from "../audit";
import type { AccountType } from "../types";

export interface AccountingFormState {
  error?: string;
}

const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createAccountAction(
  _prevState: AccountingFormState,
  formData: FormData
): Promise<AccountingFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const code = String(formData.get("code") ?? "").trim();
  const nameEn = String(formData.get("name_en") ?? "").trim();
  const nameBn = String(formData.get("name_bn") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AccountType;
  const key = slugify(nameEn);

  if (!code || !nameEn || !nameBn || !key) {
    return { error: "accounting.error.fieldsRequired" };
  }
  if (!ACCOUNT_TYPES.includes(type)) {
    return { error: "accounting.error.fieldsRequired" };
  }

  const dupe = await db`
    SELECT 1 FROM accounts WHERE farm_id = ${owner.farm_id} AND key = ${key}
  `;
  if (dupe.length > 0) {
    return { error: "accounting.error.duplicate" };
  }

  const maxOrder = await db`
    SELECT COALESCE(MAX(sort_order), 0) as m FROM accounts WHERE farm_id = ${owner.farm_id}
  `;
  const nextOrder = Number((maxOrder[0] as { m: number }).m) + 1;

  const inserted = await db`
    INSERT INTO accounts (farm_id, key, code, name_en, name_bn, type, sort_order)
    VALUES (${owner.farm_id}, ${key}, ${code}, ${nameEn}, ${nameBn}, ${type}, ${nextOrder})
    RETURNING id
  `;
  const accountId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "accounting",
    recordId: accountId,
    summary: `Added account: ${code} ${nameEn}`,
    after: { code, nameEn, nameBn, type },
  });

  revalidatePath("/accounting/accounts");
  return {};
}

export async function toggleAccountStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) === "active" ? "active" : "inactive";

  await db`
    UPDATE accounts SET status = ${status}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "accounting",
    recordId: id,
    summary: `Account set to ${status}`,
    after: { status },
  });

  revalidatePath("/accounting/accounts");
}

export interface ManualEntryFormState {
  error?: string;
}

export async function createManualJournalEntryAction(
  _prevState: ManualEntryFormState,
  formData: FormData
): Promise<ManualEntryFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const entryDate = String(formData.get("entry_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const accountIds = formData.getAll("account_id").map((v) => Number(v));
  const debits = formData.getAll("debit").map((v) => Number(v) || 0);
  const credits = formData.getAll("credit").map((v) => Number(v) || 0);
  const memos = formData.getAll("memo").map((v) => String(v).trim() || null);

  if (!entryDate || !description) {
    return { error: "accounting.error.entryFieldsRequired" };
  }

  const lines = accountIds
    .map((accountId, i) => ({ accountId, debit: debits[i] ?? 0, credit: credits[i] ?? 0, memo: memos[i] ?? null }))
    .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));

  if (lines.length < 2) {
    return { error: "accounting.error.needTwoLines" };
  }

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    return { error: "accounting.error.unbalanced" };
  }

  const inserted = await db`
    INSERT INTO journal_entries (farm_id, entry_date, description, source, source_id, created_by)
    VALUES (${owner.farm_id}, ${entryDate}, ${description}, 'manual', NULL, ${owner.id})
    RETURNING id
  `;
  const entryId = (inserted[0] as { id: number }).id;

  for (const line of lines) {
    await db`
      INSERT INTO journal_lines (farm_id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (${owner.farm_id}, ${entryId}, ${line.accountId}, ${line.debit}, ${line.credit}, ${line.memo})
    `;
  }

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "accounting",
    recordId: entryId,
    summary: `Manual journal entry: ${description}`,
    after: { entryDate, description, totalDebit },
  });

  revalidatePath("/accounting/journal");
  revalidatePath("/accounting");
  return {};
}

// Manual entries only -- an auto-posted entry (source != 'manual') is
// reversed by deleting the record it came from, never directly, so the
// ledger can never drift from the Purchase/Sale/etc it represents.
export async function deleteManualJournalEntryAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`
    SELECT description FROM journal_entries WHERE id = ${id} AND farm_id = ${owner.farm_id} AND source = 'manual'
  `;
  const entry = rows[0] as { description: string } | undefined;
  if (!entry) return;

  await db`DELETE FROM journal_entries WHERE id = ${id} AND farm_id = ${owner.farm_id} AND source = 'manual'`;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "delete",
    module: "accounting",
    recordId: id,
    summary: `Deleted manual journal entry: ${entry.description}`,
    before: entry,
  });

  revalidatePath("/accounting/journal");
  revalidatePath("/accounting");
}
