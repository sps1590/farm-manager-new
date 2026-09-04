import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import { getEmployee, listSalaryPayments } from "@/lib/repo";
import {
  deleteEmployeeAction,
  markSalaryPaymentPaidAction,
  deleteSalaryPaymentAction,
} from "@/lib/actions/employees";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import SalaryPaymentForm from "@/components/forms/SalaryPaymentForm";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employeeId = Number(id);
  const owner = await requireOwner();
  const lang = owner.language;

  const employee = await getEmployee(employeeId, owner.farm_id);
  if (!employee) notFound();
  const payments = await listSalaryPayments(employeeId, owner.farm_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                employee.status === "active"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/20 text-muted"
              }`}
            >
              {t(lang, employee.status === "active" ? "common.active" : "employees.inactive")}
            </span>
          </div>
          <p className="text-sm text-muted">
            {employee.role_title || "—"}
            {employee.phone ? ` · ${employee.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/employees/${employee.id}/edit`} className="btn-secondary text-sm">
            {t(lang, "common.edit")}
          </Link>
          <ConfirmForm
            action={deleteEmployeeAction}
            hiddenFields={{ id: employee.id }}
            confirmMessage={t(lang, "common.confirmDelete")}
          >
            <button type="submit" className="btn-secondary text-sm text-danger">
              {t(lang, "common.delete")}
            </button>
          </ConfirmForm>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "employees.monthlySalary")}</p>
          <p className="text-lg font-semibold text-foreground">
            {employee.monthly_salary != null
              ? `${t(lang, "common.currency")}${employee.monthly_salary}`
              : "—"}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "employees.joinDate")}</p>
          <p className="text-lg font-semibold text-foreground">
            {employee.join_date || "—"}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "employees.housingProvided")}</p>
          <p className="text-lg font-semibold text-foreground">
            {employee.housing_provided === 1 ? t(lang, "common.active") : "—"}
          </p>
        </div>
      </div>

      {employee.notes && (
        <div className="card p-4 text-sm text-foreground">{employee.notes}</div>
      )}

      <div>
        <p className="label mb-2">{t(lang, "employees.addPayment")}</p>
        <SalaryPaymentForm lang={lang} employeeId={employee.id} />
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">
          {t(lang, "employees.paymentHistory")}
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "employees.noPayments")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "employees.payPeriod")}</th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "partners.amount")}
                  </th>
                  <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "employees.paidDate")}</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{p.pay_period}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {t(lang, "common.currency")}
                      {p.amount}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          p.status === "paid" ? "text-primary" : "text-muted"
                        }
                      >
                        {t(lang, `employees.${p.status}` as DictKey)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted">{p.paid_date || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {p.status === "pending" && (
                          <form action={markSalaryPaymentPaidAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <input
                              type="hidden"
                              name="employee_id"
                              value={employee.id}
                            />
                            <button
                              type="submit"
                              className="text-xs text-primary hover:underline"
                            >
                              {t(lang, "employees.markPaid")}
                            </button>
                          </form>
                        )}
                        <ConfirmForm
                          action={deleteSalaryPaymentAction}
                          hiddenFields={{ id: p.id, employee_id: employee.id }}
                          confirmMessage={t(lang, "common.confirmDelete")}
                        >
                          <button
                            type="submit"
                            className="text-xs text-danger hover:underline"
                          >
                            {t(lang, "common.delete")}
                          </button>
                        </ConfirmForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
