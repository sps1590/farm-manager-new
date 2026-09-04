"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { requireOwner } from "../permissions";

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
  await db`
    INSERT INTO users (farm_id, email, phone, password_hash, name, role, is_partner, language)
    VALUES (${owner.farm_id}, ${email}, ${phone}, ${passwordHash}, ${name}, 'partner', true, 'bn')
  `;

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
    SELECT id FROM users
    WHERE id = ${partnerId} AND farm_id = ${owner.farm_id} AND is_partner = true
  `;
  if (target.length === 0) {
    return { error: "partners.error.notFound" };
  }

  await db`
    INSERT INTO partner_investments (farm_id, user_id, entry_type, amount, entry_date, notes, created_by)
    VALUES (${owner.farm_id}, ${partnerId}, ${entryType}, ${amount}, ${entryDate}, ${notes ?? null}, ${owner.id})
  `;

  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteInvestmentEntryAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const partnerId = Number(formData.get("partner_id"));
  await db`DELETE FROM partner_investments WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
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
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
}

export async function updateFarmReserveAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const reserve = Number(formData.get("profit_reserve_percent"));
  if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100) return;
  await db`UPDATE farms SET profit_reserve_percent = ${reserve} WHERE id = ${owner.farm_id}`;
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
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
}
