"use client";

import { useActionState } from "react";
import { addInvestmentEntryAction, type PartnerFormState } from "@/lib/actions/partners";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialState: PartnerFormState = {};

export default function PartnerInvestmentForm({
  lang,
  partnerId,
}: {
  lang: Language;
  partnerId: number;
}) {
  const [state, formAction] = useActionState(addInvestmentEntryAction, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <input type="hidden" name="partner_id" value={partnerId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="entry_type">
            {t(lang, "partners.entryType")}
          </label>
          <select id="entry_type" name="entry_type" required className="input">
            <option value="contribution">
              {t(lang, "partners.entryType.contribution")}
            </option>
            <option value="withdrawal">
              {t(lang, "partners.entryType.withdrawal")}
            </option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">
            {t(lang, "partners.amount")}
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="any"
            min="0"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="entry_date">
            {t(lang, "common.date")}
          </label>
          <input
            id="entry_date"
            name="entry_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            {t(lang, "common.notes")}
          </label>
          <input id="notes" name="notes" className="input" />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "partners.addEntry")}</SubmitButton>
    </form>
  );
}
