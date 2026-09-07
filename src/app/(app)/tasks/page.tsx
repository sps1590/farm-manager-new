import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTasks } from "@/lib/repo";
import { completeTaskAction, deleteTaskAction } from "@/lib/actions/tasks";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const lang = user.language;
  const { status } = await searchParams;
  const filter = status === "done" ? "done" : status === "all" ? undefined : "pending";

  const tasks = await listTasks(user.farm_id, filter);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "tasks.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "tasks.subtitle")}</p>
        </div>
        {user.role === "owner" && (
          <Link href="/tasks/new" className="btn-primary">
            + {t(lang, "tasks.new")}
          </Link>
        )}
      </div>

      <div className="flex gap-2 text-sm">
        {(["pending", "done", "all"] as const).map((f) => (
          <Link
            key={f}
            href={f === "pending" ? "/tasks" : `/tasks?status=${f}`}
            className={`rounded-full px-3 py-1 ${
              filter === f || (f === "all" && filter === undefined)
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted hover:bg-surface-hover"
            }`}
          >
            {t(lang, `tasks.filter.${f}` as DictKey)}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted">{t(lang, "tasks.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "tasks.taskTitle")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "tasks.assignedTo")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "tasks.dueDate")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "tasks.recurrence")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const overdue = task.status === "pending" && task.due_date < today;
                const canComplete =
                  task.status === "pending" &&
                  (user.role === "owner" || user.id === task.assigned_to);
                return (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted">{task.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {task.assigned_to_name || t(lang, "tasks.unassigned")}
                    </td>
                    <td className={`px-4 py-2 ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                      {task.due_date}
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {t(lang, `tasks.recurrence.${task.recurrence}` as DictKey)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          task.status === "done"
                            ? "bg-primary/10 text-primary"
                            : overdue
                              ? "bg-danger/10 text-danger"
                              : "bg-muted/20 text-muted"
                        }`}
                      >
                        {t(lang, task.status === "done" ? "tasks.done" : overdue ? "tasks.overdue" : "tasks.pending")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {canComplete && (
                          <form action={completeTaskAction}>
                            <input type="hidden" name="id" value={task.id} />
                            <button type="submit" className="text-xs text-primary hover:underline">
                              {t(lang, "tasks.markDone")}
                            </button>
                          </form>
                        )}
                        {user.role === "owner" && (
                          <ConfirmForm
                            action={deleteTaskAction}
                            hiddenFields={{ id: task.id }}
                            confirmMessage={t(lang, "common.confirmDelete")}
                          >
                            <button type="submit" className="text-xs text-danger hover:underline">
                              {t(lang, "common.delete")}
                            </button>
                          </ConfirmForm>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
