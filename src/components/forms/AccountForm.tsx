"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import type { AccountingFormState } from "@/lib/actions/accounting";

const initialState: AccountingFormState = {};
const TYPES = ["asset", "liability", "equity", "income", "expense"] as const;

export default function AccountForm({
  lang,
  action,
}: {
  lang: Language;
  action: (
    prevState: AccountingFormState,
    formData: FormData
  ) => Promise<AccountingFormState>;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="label">{t(lang, "accounting.code")}</span>
        <input name="code" required className="input w-24" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "categories.nameEn")}</span>
        <input name="name_en" required className="input w-40" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "categories.nameBn")}</span>
        <input name="name_bn" required className="input w-40" />
      </label>
      <label className="text-sm">
        <span className="label">{t(lang, "accounting.accountType")}</span>
        <select name="type" className="input" defaultValue="expense">
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {t(lang, `accounting.type.${tp}` as DictKey)}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>{t(lang, "accounting.addAccount")}</SubmitButton>
      {state?.error && (
        <p className="w-full text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
    </form>
  );
}
