"use client";

import { useState, useActionState } from "react";
import { createManualJournalEntryAction, type ManualEntryFormState } from "@/lib/actions/accounting";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { AccountRow, Language } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const initialState: ManualEntryFormState = {};

interface LineDraft {
  id: number;
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
}

let nextLineId = 1;
function blankLine(): LineDraft {
  return { id: nextLineId++, accountId: "", debit: "", credit: "", memo: "" };
}

export default function NewJournalEntryForm({
  lang,
  accounts,
}: {
  lang: Language;
  accounts: AccountRow[];
}) {
  const [state, formAction] = useActionState(createManualJournalEntryAction, initialState);
  const [lines, setLines] = useState<LineDraft[]>([blankLine(), blankLine()]);

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  function updateLine(id: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="entry_date">
            {t(lang, "common.date")} *
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
          <label className="label" htmlFor="description">
            {t(lang, "accounting.description")} *
          </label>
          <input id="description" name="description" required className="input" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="label">{t(lang, "accounting.lines")}</p>
        {lines.map((line) => (
          <div key={line.id} className="flex flex-wrap items-end gap-2">
            <select
              name="account_id"
              className="input flex-1"
              value={line.accountId}
              onChange={(e) => updateLine(line.id, { accountId: e.target.value })}
            >
              <option value="">{t(lang, "common.none")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} {lang === "bn" ? a.name_bn : a.name_en}
                </option>
              ))}
            </select>
            <input
              name="debit"
              type="number"
              step="any"
              min="0"
              placeholder={t(lang, "accounting.debit")}
              className="input w-28"
              value={line.debit}
              onChange={(e) => updateLine(line.id, { debit: e.target.value, credit: "" })}
            />
            <input
              name="credit"
              type="number"
              step="any"
              min="0"
              placeholder={t(lang, "accounting.credit")}
              className="input w-28"
              value={line.credit}
              onChange={(e) => updateLine(line.id, { credit: e.target.value, debit: "" })}
            />
            <input
              name="memo"
              placeholder={t(lang, "common.notes")}
              className="input w-32"
              value={line.memo}
              onChange={(e) => updateLine(line.id, { memo: e.target.value })}
            />
            {lines.length > 2 && (
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                className="text-xs text-danger hover:underline"
              >
                {t(lang, "common.delete")}
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines((prev) => [...prev, blankLine()])}
          className="text-sm text-primary hover:underline"
        >
          + {t(lang, "accounting.addLine")}
        </button>
      </div>

      <p className={`text-sm ${balanced ? "text-primary" : "text-danger"}`}>
        {t(lang, "accounting.debit")}: {t(lang, "common.currency")}
        {formatCurrency(totalDebit)} · {t(lang, "accounting.credit")}: {t(lang, "common.currency")}
        {formatCurrency(totalCredit)} —{" "}
        {balanced ? t(lang, "accounting.balanced") : t(lang, "accounting.unbalanced")}
      </p>

      {state?.error && <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
