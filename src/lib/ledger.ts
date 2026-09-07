import "server-only";
import { getDb } from "./db";
import type { JournalSource } from "./types";

export const LEDGER_ACCOUNT_KEYS = {
  CASH: "cash",
  PARTNER_CAPITAL: "partner_capital",
  RETAINED_EARNINGS: "retained_earnings",
  SALES_INCOME: "sales_income",
  OPERATING_EXPENSES: "operating_expenses",
  PAYROLL_EXPENSE: "payroll_expense",
} as const;

export interface JournalLineInput {
  accountKey: string;
  debit?: number;
  credit?: number;
  memo?: string | null;
}

async function getAccountId(farmId: number, key: string): Promise<number | null> {
  const db = await getDb();
  const rows = await db`
    SELECT id FROM accounts WHERE farm_id = ${farmId} AND key = ${key}
  `;
  const row = rows[0] as { id: number } | undefined;
  return row ? row.id : null;
}

// Validates the entry balances (sum debits = sum credits, same invariant
// every double-entry system enforces) before inserting. Never called
// directly for user input without going through a specific posting
// helper below or the manual-entry action, which does its own validation
// first.
export async function postJournalEntry(params: {
  farmId: number;
  entryDate: string;
  description: string;
  source: JournalSource;
  sourceId: number | null;
  userId: number;
  lines: JournalLineInput[];
}): Promise<void> {
  const { farmId, entryDate, description, source, sourceId, userId, lines } = params;

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
  if (lines.length < 2 || Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error("Journal entry does not balance");
  }

  const db = await getDb();
  const inserted = await db`
    INSERT INTO journal_entries (farm_id, entry_date, description, source, source_id, created_by)
    VALUES (${farmId}, ${entryDate}, ${description}, ${source}, ${sourceId}, ${userId})
    RETURNING id
  `;
  const entryId = (inserted[0] as { id: number }).id;

  for (const line of lines) {
    const accountId = await getAccountId(farmId, line.accountKey);
    if (!accountId) continue;
    await db`
      INSERT INTO journal_lines (farm_id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (${farmId}, ${entryId}, ${accountId}, ${line.debit ?? 0}, ${line.credit ?? 0}, ${line.memo ?? null})
    `;
  }
}

// Deletes the journal entry (and its lines, ON DELETE CASCADE) posted for
// a given source record -- called from that record's own delete action.
// A no-op if nothing was ever posted (e.g. a salary payment that was
// never marked paid), matching the tolerant style of every other
// reversal in this app.
export async function reverseJournalEntry(
  farmId: number,
  source: JournalSource,
  sourceId: number
): Promise<void> {
  const db = await getDb();
  await db`
    DELETE FROM journal_entries WHERE farm_id = ${farmId} AND source = ${source} AND source_id = ${sourceId}
  `;
}
