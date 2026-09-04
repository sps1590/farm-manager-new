"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import Logo from "@/components/Logo";

const initialState: LoginState = {};

export default function LoginPage() {
  const [lang, setLang] = useState<Language>("bn");
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo withLabel label={t(lang, "login.subtitle")} />
          <button
            type="button"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="btn-secondary text-xs px-2 py-1"
          >
            {lang === "bn" ? "English" : "বাংলা"}
          </button>
        </div>

        <div className="card p-6">
          <h1 className="mb-4 text-xl font-bold text-foreground">
            {t(lang, "login.title")}
          </h1>
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="identifier">
                {t(lang, "login.username")}
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                {t(lang, "login.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
              />
            </div>
            {state.error && (
              <p className="text-sm text-danger">
                {t(lang, state.error as DictKey)}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full disabled:opacity-60"
            >
              {t(lang, "login.submit")}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/register" className="text-primary hover:underline">
            {t(lang, "login.registerLink")}
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted">
          {t(lang, "login.defaultHint")}
        </p>
      </div>
    </div>
  );
}
