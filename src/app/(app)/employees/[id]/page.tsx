import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import {
  getEmployee,
  listSalaryPayments,
  listAttendance,
  listLeaveApplications,
} from "@/lib/repo";
import {
  deleteEmployeeAction,
  markSalaryPaymentPaidAction,
  deleteSalaryPaymentAction,
  markAttendanceAction,
  updateLeaveStatusAction,
} from "@/lib/actions/employees";
import { t, type DictKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";
import ConfirmForm from "@/components/forms/ConfirmForm";
import SalaryPaymentForm from "@/components/forms/SalaryPaymentForm";
import LeaveForm from "@/components/forms/LeaveForm";

const ATTENDANCE_STATUSES = ["present", "absent", "half_day", "leave"] as const;
const ATTENDANCE_STYLE: Record<string, string> = {
  present: "bg-primary/10 text-primary",
  absent: "bg-danger/10 text-danger",
  half_day: "bg-accent/10 text-accent",
  leave: "bg-muted/20 text-muted",
};
const LEAVE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent/10 text-accent",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-danger/10 text-danger",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employeeId = Number(id);
  const owner = await requireOwner();
  const lang = owner.language;

  const [employee, payments, attendance, leaveApplications] = await Promise.all([
    getEmployee(employeeId, owner.farm_id),
    listSalaryPayments(employeeId, owner.farm_id),
    listAttendance(employeeId, owner.farm_id, 14),
    listLeaveApplications(employeeId, owner.farm_id),
  ]);
  if (!employee) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const todayStatus = attendance.find((a) => a.date === today)?.status;

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
              ? `${t(lang, "common.currency")}${formatCurrency(employee.monthly_salary)}`
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
                      {formatCurrency(p.amount)}
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

      <div>
        <h2 className="mb-2 font-semibold text-foreground">
          {t(lang, "employees.attendance")}
        </h2>
        <form
          action={markAttendanceAction}
          className="card mb-3 flex flex-wrap items-end gap-3 p-4"
        >
          <input type="hidden" name="employee_id" value={employee.id} />
          <div>
            <label className="label" htmlFor="date">
              {t(lang, "common.date")}
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={today}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="att_status">
              {t(lang, "employees.attendanceStatus")}
            </label>
            <select
              id="att_status"
              name="status"
              defaultValue={todayStatus ?? "present"}
              className="input"
            >
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(lang, `employees.attendance.${s}` as DictKey)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary">
            {t(lang, "employees.markAttendance")}
          </button>
        </form>
        {attendance.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "employees.noAttendance")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[300px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{a.date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ATTENDANCE_STYLE[a.status] ?? "bg-muted/20 text-muted"
                        }`}
                      >
                        {t(lang, `employees.attendance.${a.status}` as DictKey)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="label mb-2">{t(lang, "employees.applyLeave")}</p>
        <LeaveForm lang={lang} employeeId={employee.id} />
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">
          {t(lang, "employees.leaveHistory")}
        </h2>
        {leaveApplications.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "employees.noLeave")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "employees.leaveType")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "employees.leaveStart")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "employees.leaveEnd")}</th>
                  <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {leaveApplications.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {t(lang, `employees.leaveType.${l.leave_type}` as DictKey)}
                    </td>
                    <td className="px-4 py-2 text-muted">{l.start_date}</td>
                    <td className="px-4 py-2 text-muted">{l.end_date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          LEAVE_STATUS_STYLE[l.status] ?? "bg-muted/20 text-muted"
                        }`}
                      >
                        {t(lang, `employees.leaveStatus.${l.status}` as DictKey)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {l.status === "pending" && (
                        <div className="flex items-center justify-end gap-3">
                          <form action={updateLeaveStatusAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="employee_id" value={employee.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button
                              type="submit"
                              className="text-xs text-primary hover:underline"
                            >
                              {t(lang, "employees.approve")}
                            </button>
                          </form>
                          <form action={updateLeaveStatusAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="employee_id" value={employee.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button
                              type="submit"
                              className="text-xs text-danger hover:underline"
                            >
                              {t(lang, "employees.reject")}
                            </button>
                          </form>
                        </div>
                      )}
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
