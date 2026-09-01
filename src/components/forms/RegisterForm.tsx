"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialState: RegisterState = {};

export default function RegisterForm({
  lang,
  defaultEmail,
  defaultPhone,
}: {
  lang: Language;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="farmName">
          {t(lang, "register.farmName")}
        </label>
        <input id="farmName" name="farmName" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="name">
          {t(lang, "register.yourName")}
        </label>
        <input id="name" name="name" required className="input" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            {t(lang, "register.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultEmail}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            {t(lang, "register.phone")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultPhone}
            className="input"
          />
        </div>
      </div>
      <p className="text-xs text-muted">{t(lang, "register.identifierHint")}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            {t(lang, "register.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">
            {t(lang, "register.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className="input"
          />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "register.submit")}</SubmitButton>
    </form>
  );
}
