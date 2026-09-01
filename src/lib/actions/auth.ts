"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  verifyLogin,
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
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "login.error" };
  }

  const user = await verifyLogin(username, password);
  if (!user) {
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
