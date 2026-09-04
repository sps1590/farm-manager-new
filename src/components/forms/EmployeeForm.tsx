"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { EmployeeRow, Language } from "@/lib/types";
import type { EmployeeFormState } from "@/lib/actions/employees";

const initialState: EmployeeFormState = {};

export default function EmployeeForm({
  lang,
  action,
  employee,
}: {
  lang: Language;
  action: (
    prevState: EmployeeFormState,
    formData: FormData
  ) => Promise<EmployeeFormState>;
  employee?: EmployeeRow;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {employee && <input type="hidden" name="id" value={employee.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            {t(lang, "team.memberName")}
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={employee?.name}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="role_title">
            {t(lang, "employees.roleTitle")}
          </label>
          <input
            id="role_title"
            name="role_title"
            defaultValue={employee?.role_title ?? ""}
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
            defaultValue={employee?.phone ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="join_date">
            {t(lang, "employees.joinDate")}
          </label>
          <input
            id="join_date"
            name="join_date"
            type="date"
            defaultValue={employee?.join_date ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="monthly_salary">
            {t(lang, "employees.monthlySalary")}
          </label>
          <input
            id="monthly_salary"
            name="monthly_salary"
            type="number"
            step="any"
            min="0"
            defaultValue={employee?.monthly_salary ?? ""}
            className="input"
          />
        </div>
        {employee && (
          <div>
            <label className="label" htmlFor="status">
              {t(lang, "common.status")}
            </label>
            <select
              id="status"
              name="status"
              defaultValue={employee.status}
              className="input"
            >
              <option value="active">{t(lang, "common.active")}</option>
              <option value="inactive">{t(lang, "employees.inactive")}</option>
            </select>
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="housing_provided"
          defaultChecked={employee?.housing_provided === 1}
        />
        {t(lang, "employees.housingProvided")}
      </label>
      <div>
        <label className="label" htmlFor="notes">
          {t(lang, "common.notes")}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={employee?.notes ?? ""}
          className="input"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
