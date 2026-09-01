"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import {
  findUserByIdentifier,
  checkPassword,
  createSessionForUser,
  destroySession,
  getSessionUser,
  setUserLanguage,
} from "../auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "login.error" };
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    redirect(`/register?identifier=${encodeURIComponent(identifier)}`);
  }

  if (!checkPassword(user, password)) {
    return { error: "login.error" };
  }

  await createSessionForUser(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function toggleLanguageAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const next = user.language === "bn" ? "en" : "bn";
  await setUserLanguage(user.id, next);
  revalidatePath("/", "layout");
}

export interface RegisterState {
  error?: string;
}

const registerSchema = z
  .object({
    farmName: z.string().min(2).max(120),
    name: z.string().min(2).max(120),
    email: z.union([z.literal(""), z.string().email()]),
    phone: z.string().max(20),
    password: z.string().min(8).max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
  })
  .refine((d) => d.email !== "" || d.phone !== "", {
    path: ["email"],
  });

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    farmName: String(formData.get("farmName") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const errorKey =
      field === "farmName"
        ? "register.error.farmNameRequired"
        : field === "name"
        ? "register.error.nameRequired"
        : field === "email"
        ? raw.email !== ""
          ? "register.error.emailInvalid"
          : "register.error.identifierRequired"
        : field === "password"
        ? "register.error.passwordTooShort"
        : field === "confirmPassword"
        ? "register.error.passwordMismatch"
        : "register.error.invalid";
    return { error: errorKey };
  }

  const { farmName, name, password } = parsed.data;
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

  const farmRows = await db`
    INSERT INTO farms (name, contact_email, contact_phone)
    VALUES (${farmName}, ${email}, ${phone})
    RETURNING id
  `;
  const farmId = (farmRows[0] as { id: number }).id;

  let userId: number;
  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const userRows = await db`
      INSERT INTO users (farm_id, email, phone, password_hash, name, role, language)
      VALUES (${farmId}, ${email}, ${phone}, ${passwordHash}, ${name}, 'owner', 'bn')
      RETURNING id
    `;
    userId = (userRows[0] as { id: number }).id;
  } catch {
    // The Neon HTTP driver has no cross-statement transaction here (see
    // docs/PROJECT.md), so compensate for the orphaned farm row by hand.
    await db`DELETE FROM farms WHERE id = ${farmId}`;
    return { error: "register.error.emailTaken" };
  }

  await createSessionForUser(userId);
  redirect("/dashboard");
}
