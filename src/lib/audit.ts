import "server-only";
import { getDb } from "./db";
import type { AuditAction } from "./types";

// Append-only trail of who changed what, when. Called from mutating Server
// Actions after the primary write succeeds. Logging failures are swallowed
// -- the audit trail must never be the reason a real farm operation fails.
export async function logAudit(params: {
  farmId: number;
  userId: number;
  action: AuditAction;
  module: string;
  recordId: number | null;
  summary: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const db = await getDb();
    await db`
      INSERT INTO audit_log (farm_id, user_id, action, module, record_id, summary, before_json, after_json)
      VALUES (
        ${params.farmId}, ${params.userId}, ${params.action}, ${params.module}, ${params.recordId},
        ${params.summary},
        ${params.before !== undefined ? JSON.stringify(params.before) : null},
        ${params.after !== undefined ? JSON.stringify(params.after) : null}
      )
    `;
  } catch {
    // Never let audit logging break the action it's observing.
  }
}
