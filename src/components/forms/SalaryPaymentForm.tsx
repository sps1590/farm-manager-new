"use client";

import { useActionState } from "react";
import { addSalaryPaymentAction, type EmployeeFormState } from "@/lib/actions/employees";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialState: EmployeeFormState = {};

export default function SalaryPaymentForm({
  lang,
  employeeId,
}: {
  lang: Language;
  employeeId: number;
}) {
  const [state, formAction] = useActionState(addSalaryPaymentAction, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <input type="hidden" name="employee_id" value={employeeId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pay_period">
            {t(lang, "employees.payPeriod")}
          </label>
          <input
            id="pay_period"
            name="pay_period"
            required
            placeholder="2026-09"
            defaultValue={new Date().toISOString().slice(0, 7)}
            className="input"
          />
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
          <label className="label" htmlFor="status">
            {t(lang, "common.status")}
          </label>
          <select id="status" name="status" defaultValue="pending" className="input">
            <option value="pending">{t(lang, "employees.pending")}</option>
            <option value="paid">{t(lang, "employees.paid")}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="paid_date">
            {t(lang, "employees.paidDate")}
          </label>
          <input id="paid_date" name="paid_date" type="date" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            {t(lang, "common.notes")}
          </label>
          <input id="notes" name="notes" className="input" />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "employees.addPayment")}</SubmitButton>
    </form>
  );
}
