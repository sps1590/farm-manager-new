"use client";

import { useActionState } from "react";
import { applyLeaveAction, type LeaveFormState } from "@/lib/actions/employees";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const initialState: LeaveFormState = {};
const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid", "other"] as const;

export default function LeaveForm({
  lang,
  employeeId,
}: {
  lang: Language;
  employeeId: number;
}) {
  const [state, formAction] = useActionState(applyLeaveAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <input type="hidden" name="employee_id" value={employeeId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="leave_type">
            {t(lang, "employees.leaveType")}
          </label>
          <select id="leave_type" name="leave_type" defaultValue="casual" className="input">
            {LEAVE_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {t(lang, `employees.leaveType.${lt}` as DictKey)}
              </option>
            ))}
          </select>
        </div>
        <div />
        <div>
          <label className="label" htmlFor="start_date">
            {t(lang, "employees.leaveStart")}
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={today}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="end_date">
            {t(lang, "employees.leaveEnd")}
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            defaultValue={today}
            className="input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="reason">
            {t(lang, "employees.leaveReason")}
          </label>
          <input id="reason" name="reason" className="input" />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "employees.applyLeave")}</SubmitButton>
    </form>
  );
}
