import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { listEmployees } from "@/lib/repo";
import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";

export default async function EmployeesPage() {
  const owner = await requireOwner();
  const lang = owner.language;
  const employees = await listEmployees(owner.farm_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t(lang, "employees.title")}
          </h1>
          <p className="text-sm text-muted">{t(lang, "employees.subtitle")}</p>
        </div>
        <Link href="/employees/new" className="btn-primary">
          + {t(lang, "employees.addEmployee")}
        </Link>
      </div>

      {employees.length === 0 ? (
        <p className="text-muted">{t(lang, "employees.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "team.memberName")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "employees.roleTitle")}</th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "employees.monthlySalary")}
                </th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr
                  key={e.id}
                  className={`border-b border-border last:border-0 ${
                    e.status === "inactive" ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/employees/${e.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{e.role_title || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {e.monthly_salary != null
                      ? `${t(lang, "common.currency")}${formatCurrency(e.monthly_salary)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/20 text-muted"
                      }`}
                    >
                      {t(lang, e.status === "active" ? "common.active" : "employees.inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
