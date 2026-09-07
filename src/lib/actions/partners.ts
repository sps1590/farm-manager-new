"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { logAudit } from "../audit";
import { postJournalEntry, reverseJournalEntry, LEDGER_ACCOUNT_KEYS } from "../ledger";

export interface PartnerFormState {
  error?: string;
}

const createPartnerSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.union([z.literal(""), z.string().email()]),
    phone: z.string().max(20),
    password: z.string().min(8).max(72),
  })
  .refine((d) => d.email !== "" || d.phone !== "", { path: ["email"] });

export async function createPartnerAction(
  _prevState: PartnerFormState,
  formData: FormData
): Promise<PartnerFormState> {
  const owner = await requireOwner();

  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = createPartnerSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const errorKey =
      field === "name"
        ? "partners.error.nameRequired"
        : field === "email"
        ? raw.email !== ""
          ? "register.error.emailInvalid"
          : "partners.error.identifierRequired"
        : field === "password"
        ? "partners.error.passwordTooShort"
        : "register.error.invalid";
    return { error: errorKey };
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email || null;
  const phone = parsed.data.phone || null;

  const db = await getDb();

  if (email) {
    const rows = await db`SELECT id FROM users WHERE email = ${email}`;
    if (rows.length > 0) return { error: "register.error.emailTaken" };
  }
  if (phone) {
    const rows = await db`SELECT id FROM users WHERE phone = ${phone}`;
    if (rows.length > 0) return { error: "register.error.phoneTaken" };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const inserted = await db`
    INSERT INTO users (farm_id, email, phone, password_hash, name, role, is_partner, language)
    VALUES (${owner.farm_id}, ${email}, ${phone}, ${passwordHash}, ${name}, 'partner', true, 'bn')
    RETURNING id
  `;
  const partnerId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "partners",
    recordId: partnerId,
    summary: `Added partner: ${name}`,
    after: { name, email, phone },
  });

  revalidatePath("/partners");
  redirect("/partners");
}

const entrySchema = z.object({
  partnerId: z.coerce.number().int().positive(),
  entryType: z.enum(["contribution", "withdrawal"]),
  amount: z.coerce.number().positive(),
  entryDate: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export async function addInvestmentEntryAction(
  _prevState: PartnerFormState,
  formData: FormData
): Promise<PartnerFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const parsed = entrySchema.safeParse({
    partnerId: formData.get("partner_id"),
    entryType: formData.get("entry_type"),
    amount: formData.get("amount"),
    entryDate: formData.get("entry_date"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: "partners.error.invalidEntry" };
  }
  const { partnerId, entryType, amount, entryDate, notes } = parsed.data;

  const target = await db`
    SELECT id, name FROM users
    WHERE id = ${partnerId} AND farm_id = ${owner.farm_id} AND is_partner = true
  `;
  if (target.length === 0) {
    return { error: "partners.error.notFound" };
  }
  const partnerName = (target[0] as { name: string }).name;

  const inserted = await db`
    INSERT INTO partner_investments (farm_id, user_id, entry_type, amount, entry_date, notes, created_by)
    VALUES (${owner.farm_id}, ${partnerId}, ${entryType}, ${amount}, ${entryDate}, ${notes ?? null}, ${owner.id})
    RETURNING id
  `;
  const entryId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "partners",
    recordId: entryId,
    summary: `Partner ${entryType}: ${amount} for partner #${partnerId}`,
    after: { partnerId, entryType, amount, entryDate },
  });

  await postJournalEntry({
    farmId: owner.farm_id,
    entryDate,
    description: `Partner ${entryType}: ${partnerName}`,
    source: "partner",
    sourceId: entryId,
    userId: owner.id,
    lines:
      entryType === "contribution"
        ? [
            { accountKey: LEDGER_ACCOUNT_KEYS.CASH, debit: amount },
            { accountKey: LEDGER_ACCOUNT_KEYS.PARTNER_CAPITAL, credit: amount },
          ]
        : [
            { accountKey: LEDGER_ACCOUNT_KEYS.PARTNER_CAPITAL, debit: amount },
            { accountKey: LEDGER_ACCOUNT_KEYS.CASH, credit: amount },
          ],
  });

  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  return {};
}

export async function deleteInvestmentEntryAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const partnerId = Number(formData.get("partner_id"));
  const rows = await db`
    SELECT entry_type, amount FROM partner_investments WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;
  const entry = rows[0] as { entry_type: string; amount: number } | undefined;
  await db`DELETE FROM partner_investments WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  await reverseJournalEntry(owner.farm_id, "partner", id);
  if (entry) {
    await logAudit({
      farmId: owner.farm_id,
      userId: owner.id,
      action: "delete",
      module: "partners",
      recordId: id,
      summary: `Deleted partner ${entry.entry_type}: ${entry.amount} for partner #${partnerId}`,
      before: entry,
    });
  }
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
}

// Manually setting a share % switches that partner out of auto-sync --
// their share stops tracking ownership % live and stays at this value until
// the owner resets it (see resetPartnerProfitShareAction).
export async function updatePartnerProfitShareAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const partnerId = Number(formData.get("partner_id"));
  const profitShare = Number(formData.get("profit_share_percent"));
  if (!Number.isFinite(profitShare) || profitShare < 0 || profitShare > 100) return;
  await db`
    UPDATE users SET profit_share_percent = ${profitShare}, profit_share_auto = false
    WHERE id = ${partnerId} AND farm_id = ${owner.farm_id} AND is_partner = true
  `;
  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "partners",
    recordId: partnerId,
    summary: `Set manual profit share to ${profitShare}% for partner #${partnerId}`,
    after: { profitShare, profitShareAuto: false },
  });
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
}

export async function resetPartnerProfitShareAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const partnerId = Number(formData.get("partner_id"));
  await db`
    UPDATE users SET profit_share_auto = true
    WHERE id = ${partnerId} AND farm_id = ${owner.farm_id} AND is_partner = true
  `;
  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "partners",
    recordId: partnerId,
    summary: `Reset profit share to auto-sync for partner #${partnerId}`,
    after: { profitShareAuto: true },
  });
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
}

export async function updateFarmReserveAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const reserve = Number(formData.get("profit_reserve_percent"));
  if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100) return;
  await db`UPDATE farms SET profit_reserve_percent = ${reserve} WHERE id = ${owner.farm_id}`;
  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "partners",
    recordId: null,
    summary: `Set company reserve to ${reserve}%`,
    after: { reserve },
  });
  revalidatePath("/partners");
}

// Deactivating drops a partner out of the live ownership %/profit-share pool
// (see fetchPartnerSummaries in repo.ts) and blocks future logins, but keeps
// their historical ledger intact for records. Existing sessions are killed
// immediately so access doesn't linger until the cookie expires.
export async function deactivatePartnerAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const partnerId = Number(formData.get("partner_id"));
  await db`
    UPDATE users SET partner_status = 'inactive'
    WHERE id = ${partnerId} AND farm_id = ${owner.farm_id} AND is_partner = true
  `;
  await db`DELETE FROM sessions WHERE user_id = ${partnerId}`;
  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "partners",
    recordId: partnerId,
    summary: `Deactivated partner #${partnerId}`,
    after: { partnerStatus: "inactive" },
  });
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
}

export async function reactivatePartnerAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const partnerId = Number(formData.get("partner_id"));
  await db`
    UPDATE users SET partner_status = 'active'
    WHERE id = ${partnerId} AND farm_id = ${owner.farm_id} AND is_partner = true
  `;
  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "partners",
    recordId: partnerId,
    summary: `Reactivated partner #${partnerId}`,
    after: { partnerStatus: "active" },
  });
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
}
