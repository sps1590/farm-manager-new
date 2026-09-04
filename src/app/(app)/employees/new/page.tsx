import { requireOwner } from "@/lib/permissions";
import { createEmployeeAction } from "@/lib/actions/employees";
import { t } from "@/lib/i18n";
import EmployeeForm from "@/components/forms/EmployeeForm";

export default async function NewEmployeePage() {
  const owner = await requireOwner();
  const lang = owner.language;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        {t(lang, "employees.addEmployee")}
      </h1>
      <EmployeeForm lang={lang} action={createEmployeeAction} />
    </div>
  );
}
