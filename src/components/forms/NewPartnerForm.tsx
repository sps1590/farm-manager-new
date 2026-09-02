"use client";

import { useActionState } from "react";
import { createPartnerAction, type PartnerFormState } from "@/lib/actions/partners";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialState: PartnerFormState = {};

export default function NewPartnerForm({ lang }: { lang: Language }) {
  const [state, formAction] = useActionState(createPartnerAction, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="name">
          {t(lang, "team.memberName")}
        </label>
        <input id="name" name="name" required className="input" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            {t(lang, "register.email")}
          </label>
          <input id="email" name="email" type="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            {t(lang, "register.phone")}
          </label>
          <input id="phone" name="phone" type="tel" className="input" />
        </div>
      </div>
      <p className="text-xs text-muted">{t(lang, "register.identifierHint")}</p>
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
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "partners.addPartner")}</SubmitButton>
    </form>
  );
}
