import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import { getEmployee } from "@/lib/repo";
import { updateEmployeeAction } from "@/lib/actions/employees";
import { t } from "@/lib/i18n";
import EmployeeForm from "@/components/forms/EmployeeForm";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = await requireOwner();
  const lang = owner.language;
  const employee = await getEmployee(Number(id), owner.farm_id);
  if (!employee) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        {t(lang, "employees.editEmployee")}
      </h1>
      <EmployeeForm lang={lang} action={updateEmployeeAction} employee={employee} />
    </div>
  );
}
