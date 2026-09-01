import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { SessionUser, UserRow } from "./types";

const SESSION_COOKIE = "farm_session";
const SESSION_DAYS = 30;

export async function verifyLogin(
  username: string,
  password: string
): Promise<UserRow | null> {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as unknown as UserRow | undefined;
  if (!user) return null;
  const ok = bcrypt.compareSync(password, user.password_hash);
  return ok ? user : null;
}

export async function createSessionForUser(userId: number): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(id, userId, expiresAt);

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
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.name, u.role, u.language, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(sid) as unknown as
    | (SessionUser & { expires_at: string })
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    language: row.language,
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
  const db = getDb();
  db.prepare("UPDATE users SET language = ? WHERE id = ?").run(
    language,
    userId
  );
}
