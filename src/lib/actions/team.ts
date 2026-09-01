"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { MODULES, RESERVED_OWNER_ROLE } from "../types";
import type { Module } from "../types";

export interface TeamFormState {
  error?: string;
}

function readPermissionInput(formData: FormData, module: Module) {
  return {
    view: formData.get(`perm_${module}_view`) === "on",
    create: formData.get(`perm_${module}_create`) === "on",
    edit: formData.get(`perm_${module}_edit`) === "on",
    delete: formData.get(`perm_${module}_delete`) === "on",
  };
}

async function savePermissions(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number,
  formData: FormData
) {
  for (const module of MODULES) {
    const perm = readPermissionInput(formData, module);
    await db`
      INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
      VALUES (${userId}, ${module}, ${perm.view}, ${perm.create}, ${perm.edit}, ${perm.delete})
      ON CONFLICT (user_id, module) DO UPDATE SET
        can_view = EXCLUDED.can_view,
        can_create = EXCLUDED.can_create,
        can_edit = EXCLUDED.can_edit,
        can_delete = EXCLUDED.can_delete
    `;
  }
}

function resolveRole(formData: FormData): string {
  const preset = String(formData.get("rolePreset") ?? "");
  const custom = String(formData.get("customRole") ?? "").trim();
  return preset === "other" ? custom : preset;
}

export async function createTeamMemberAction(
  _prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const role = resolveRole(formData);

  if (!name || name.length < 2) return { error: "team.error.nameRequired" };
  if (!email && !phone) return { error: "team.error.identifierRequired" };
  if (!password || password.length < 8) {
    return { error: "team.error.passwordTooShort" };
  }
  if (!role || role === RESERVED_OWNER_ROLE) {
    return { error: "team.error.roleRequired" };
  }

  if (email) {
    const rows = await db`SELECT id FROM users WHERE email = ${email}`;
    if (rows.length > 0) return { error: "team.error.identifierTaken" };
  }
  if (phone) {
    const rows = await db`SELECT id FROM users WHERE phone = ${phone}`;
    if (rows.length > 0) return { error: "team.error.identifierTaken" };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userRows = await db`
    INSERT INTO users (farm_id, email, phone, password_hash, name, role, language)
    VALUES (${owner.farm_id}, ${email}, ${phone}, ${passwordHash}, ${name}, ${role}, 'bn')
    RETURNING id
  `;
  const userId = (userRows[0] as { id: number }).id;

  await savePermissions(db, userId, formData);

  revalidatePath("/team");
  redirect("/team");
}

export async function updateTeamMemberAction(
  _prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = resolveRole(formData);
  const newPassword = String(formData.get("password") ?? "");

  // The target must belong to this farm and can never be the owner account --
  // owner is reserved and can't be demoted or have its permissions edited here.
  const rows = await db`
    SELECT id, role FROM users WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;
  const target = rows[0] as { id: number; role: string } | undefined;
  if (!target || target.role === RESERVED_OWNER_ROLE) {
    return { error: "team.error.notFound" };
  }

  if (!name || name.length < 2) return { error: "team.error.nameRequired" };
  if (!email && !phone) return { error: "team.error.identifierRequired" };
  if (!role || role === RESERVED_OWNER_ROLE) {
    return { error: "team.error.roleRequired" };
  }

  if (email) {
    const dupe = await db`SELECT id FROM users WHERE email = ${email} AND id != ${id}`;
    if (dupe.length > 0) return { error: "team.error.identifierTaken" };
  }
  if (phone) {
    const dupe = await db`SELECT id FROM users WHERE phone = ${phone} AND id != ${id}`;
    if (dupe.length > 0) return { error: "team.error.identifierTaken" };
  }

  if (newPassword) {
    if (newPassword.length < 8) return { error: "team.error.passwordTooShort" };
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await db`
      UPDATE users SET name = ${name}, email = ${email}, phone = ${phone}, role = ${role}, password_hash = ${passwordHash}
      WHERE id = ${id} AND farm_id = ${owner.farm_id}
    `;
  } else {
    await db`
      UPDATE users SET name = ${name}, email = ${email}, phone = ${phone}, role = ${role}
      WHERE id = ${id} AND farm_id = ${owner.farm_id}
    `;
  }

  await savePermissions(db, id, formData);

  revalidatePath("/team");
  redirect("/team");
}

export async function deleteTeamMemberAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  await db`
    DELETE FROM users
    WHERE id = ${id} AND farm_id = ${owner.farm_id} AND role != ${RESERVED_OWNER_ROLE}
  `;
  revalidatePath("/team");
}
