"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { t, type DictKey } from "@/lib/i18n";
import type { Language, TeamMemberRow } from "@/lib/types";
import type { TaskFormState } from "@/lib/actions/tasks";

const initialState: TaskFormState = {};
const RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;

export default function TaskForm({
  lang,
  action,
  members,
}: {
  lang: Language;
  action: (
    prevState: TaskFormState,
    formData: FormData
  ) => Promise<TaskFormState>;
  members: TeamMemberRow[];
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="title">
          {t(lang, "tasks.taskTitle")}
        </label>
        <input id="title" name="title" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">
          {t(lang, "common.notes")}
        </label>
        <textarea id="description" name="description" rows={2} className="input" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="assigned_to">
            {t(lang, "tasks.assignedTo")}
          </label>
          <select id="assigned_to" name="assigned_to" className="input" defaultValue="">
            <option value="">{t(lang, "tasks.unassigned")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="due_date">
            {t(lang, "tasks.dueDate")} *
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="recurrence">
            {t(lang, "tasks.recurrence")}
          </label>
          <select id="recurrence" name="recurrence" className="input" defaultValue="none">
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {t(lang, `tasks.recurrence.${r}` as DictKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state?.error && <p className="text-sm text-danger">{t(lang, state.error as DictKey)}</p>}
      <SubmitButton>{t(lang, "common.save")}</SubmitButton>
    </form>
  );
}
