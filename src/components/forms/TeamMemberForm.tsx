"use client";

import { useActionState, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import { MODULES } from "@/lib/types";
import type { Language, Module, PermAction, TeamMemberRow } from "@/lib/types";
import type { TeamFormState } from "@/lib/actions/team";

const initialState: TeamFormState = {};

const PRESET_ROLES = ["manager", "employee"];
const PERM_ACTIONS: Array<{ action: PermAction; labelKey: DictKey }> = [
  { action: "view", labelKey: "common.view" },
  { action: "create", labelKey: "common.add" },
  { action: "edit", labelKey: "common.edit" },
  { action: "delete", labelKey: "common.delete" },
];
const MODULE_LABEL_KEYS: Record<Module, DictKey> = {
  batches: "nav.batches",
  purchases: "nav.purchases",
  sales: "nav.sales",
  medical: "nav.medical",
};

export default function TeamMemberForm({
  lang,
  action,
  member,
}: {
  lang: Language;
  action: (
    prevState: TeamFormState,
    formData: FormData
  ) => Promise<TeamFormState>;
  member?: TeamMemberRow;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const initialPreset =
    member && !PRESET_ROLES.includes(member.role) ? "other" : member?.role ?? "employee";
  const [rolePreset, setRolePreset] = useState(initialPreset);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {member && <input type="hidden" name="id" value={member.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            {t(lang, "register.yourName")}
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={member?.name}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="rolePreset">
            {t(lang, "team.role")}
          </label>
          <select
            id="rolePreset"
            name="rolePreset"
            className="input"
            value={rolePreset}
            onChange={(e) => setRolePreset(e.target.value)}
          >
            <option value="manager">{t(lang, "roles.manager")}</option>
            <option value="employee">{t(lang, "roles.employee")}</option>
            <option value="other">{t(lang, "roles.other")}</option>
          </select>
        </div>
      </div>

      {rolePreset === "other" && (
        <div>
          <label className="label" htmlFor="customRole">
            {t(lang, "roles.customLabel")}
          </label>
          <input
            id="customRole"
            name="customRole"
            defaultValue={
              member && !PRESET_ROLES.includes(member.role) ? member.role : ""
            }
            className="input"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            {t(lang, "register.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={member?.email ?? ""}
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
            defaultValue={member?.phone ?? ""}
            className="input"
          />
        </div>
      </div>
      <p className="text-xs text-muted">{t(lang, "register.identifierHint")}</p>

      <div>
        <label className="label" htmlFor="password">
          {member ? t(lang, "team.newPassword") : t(lang, "register.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={!member}
          className="input"
        />
      </div>

      <div>
        <p className="label mb-2">{t(lang, "team.permissions")}</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-2 font-medium">{t(lang, "team.module")}</th>
                {PERM_ACTIONS.map(({ action, labelKey }) => (
                  <th key={action} className="px-3 py-2 text-center font-medium">
                    {t(lang, labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((module) => (
                <tr key={module} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {t(lang, MODULE_LABEL_KEYS[module])}
                  </td>
                  {PERM_ACTIONS.map(({ action }) => (
                    <td key={action} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        name={`perm_${module}_${action}`}
                        defaultChecked={member?.permissions[module][action] ?? false}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>
      )}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
