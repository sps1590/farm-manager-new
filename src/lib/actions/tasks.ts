"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { requireUser } from "../auth";
import { logAudit } from "../audit";
import type { TaskRecurrence } from "../types";

const RECURRENCES: TaskRecurrence[] = ["none", "daily", "weekly", "monthly"];

export interface TaskFormState {
  error?: string;
}

export async function createTaskAction(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const assignedTo = formData.get("assigned_to")
    ? Number(formData.get("assigned_to"))
    : null;
  const dueDate = String(formData.get("due_date") ?? "");
  const recurrence = String(formData.get("recurrence") ?? "none") as TaskRecurrence;

  if (!title || !dueDate) {
    return { error: "tasks.error.titleAndDateRequired" };
  }
  if (!RECURRENCES.includes(recurrence)) {
    return { error: "tasks.error.titleAndDateRequired" };
  }

  const inserted = await db`
    INSERT INTO tasks (farm_id, title, description, assigned_to, due_date, recurrence, created_by)
    VALUES (${owner.farm_id}, ${title}, ${description}, ${assignedTo}, ${dueDate}, ${recurrence}, ${owner.id})
    RETURNING id
  `;
  const taskId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "tasks",
    recordId: taskId,
    summary: `Added task: ${title}`,
    after: { title, assignedTo, dueDate, recurrence },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}

function nextDueDate(dueDate: string, recurrence: TaskRecurrence): string | null {
  if (recurrence === "none") return null;
  const d = new Date(`${dueDate}T00:00:00Z`);
  if (recurrence === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (recurrence === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (recurrence === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Either the owner or the task's own assignee may complete it. Completing a
// recurring task inserts the next occurrence synchronously -- no cron job,
// consistent with the rest of this app.
export async function completeTaskAction(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`SELECT * FROM tasks WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  const task = rows[0] as
    | {
        id: number;
        title: string;
        description: string | null;
        assigned_to: number | null;
        due_date: string;
        recurrence: TaskRecurrence;
        status: string;
      }
    | undefined;
  if (!task) redirect("/dashboard");
  if (user.role !== "owner" && user.id !== task!.assigned_to) redirect("/dashboard");

  await db`
    UPDATE tasks SET status = 'done', completed_at = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;

  const upcoming = nextDueDate(task!.due_date, task!.recurrence);
  if (upcoming) {
    await db`
      INSERT INTO tasks (farm_id, title, description, assigned_to, due_date, recurrence, created_by)
      VALUES (${user.farm_id}, ${task!.title}, ${task!.description}, ${task!.assigned_to}, ${upcoming}, ${task!.recurrence}, ${user.id})
    `;
  }

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "update",
    module: "tasks",
    recordId: id,
    summary: `Completed task: ${task!.title}`,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`SELECT title FROM tasks WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  const task = rows[0] as { title: string } | undefined;

  await db`DELETE FROM tasks WHERE id = ${id} AND farm_id = ${owner.farm_id}`;

  if (task) {
    await logAudit({
      farmId: owner.farm_id,
      userId: owner.id,
      action: "delete",
      module: "tasks",
      recordId: id,
      summary: `Deleted task: ${task.title}`,
      before: task,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
