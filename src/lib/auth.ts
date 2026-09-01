import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import {
  emptyPermissions,
  type Module,
  type PermissionsMap,
  type SessionUser,
  type UserRow,
} from "./types";

const SESSION_COOKIE = "farm_session";
const SESSION_DAYS = 30;

async function loadPermissions(userId: number): Promise<PermissionsMap> {
  const db = await getDb();
  const rows = await db`
    SELECT module, can_view, can_create, can_edit, can_delete
    FROM user_permissions WHERE user_id = ${userId}
  `;
  const permissions = emptyPermissions();
  for (const r of rows as unknown as Array<{
    module: Module;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>) {
    permissions[r.module] = {
      view: r.can_view,
      create: r.can_create,
      edit: r.can_edit,
      delete: r.can_delete,
    };
  }
  return permissions;
}

// Looks up a user by username, email, or phone -- whichever the login form's
// single "identifier" field was filled with. Returns null (not an error) when
// nothing matches, so the caller can redirect to /register instead of
// treating "unknown identifier" the same as "wrong password".
export async function findUserByIdentifier(
  identifier: string
): Promise<UserRow | null> {
  const db = await getDb();
  const rows = await db`
    SELECT * FROM users
    WHERE username = ${identifier} OR email = ${identifier} OR phone = ${identifier}
  `;
  return (rows[0] as unknown as UserRow) ?? null;
}

export function checkPassword(user: UserRow, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

export async function createSessionForUser(userId: number): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  await db`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`;

  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return id;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (sid) {
    const db = await getDb();
    await db`DELETE FROM sessions WHERE id = ${sid}`;
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const db = await getDb();
  const rows = await db`
    SELECT u.id, u.farm_id, u.username, u.email, u.phone, u.name, u.role, u.language, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sid}
  `;
  const row = rows[0] as unknown as
    | {
        id: number;
        farm_id: number;
        username: string | null;
        email: string | null;
        phone: string | null;
        name: string;
        role: string;
        language: "en" | "bn";
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db`DELETE FROM sessions WHERE id = ${sid}`;
    return null;
  }

  const permissions = await loadPermissions(row.id);

  return {
    id: row.id,
    farm_id: row.farm_id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    name: row.name,
    role: row.role,
    language: row.language,
    permissions,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function setUserLanguage(
  userId: number,
  language: "en" | "bn"
): Promise<void> {
  const db = await getDb();
  await db`UPDATE users SET language = ${language} WHERE id = ${userId}`;
}
