import { requireOwner } from "@/lib/permissions";
import { listTeamMembers } from "@/lib/repo";
import { createTaskAction } from "@/lib/actions/tasks";
import { t } from "@/lib/i18n";
import TaskForm from "@/components/forms/TaskForm";

export default async function NewTaskPage() {
  const owner = await requireOwner();
  const lang = owner.language;
  const members = await listTeamMembers(owner.farm_id);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "tasks.new")}</h1>
      <TaskForm lang={lang} action={createTaskAction} members={members} />
    </div>
  );
}
