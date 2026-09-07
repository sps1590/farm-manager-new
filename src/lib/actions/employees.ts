"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { logAudit } from "../audit";
import type { AttendanceStatus, LeaveType } from "../types";

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "half_day",
  "leave",
];
const LEAVE_TYPES: LeaveType[] = ["casual", "sick", "earned", "unpaid", "other"];

export interface EmployeeFormState {
  error?: string;
}

export async function createEmployeeAction(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const roleTitle = String(formData.get("role_title") ?? "").trim() || null;
  const joinDate = String(formData.get("join_date") ?? "") || null;
  const monthlySalary = formData.get("monthly_salary")
    ? Number(formData.get("monthly_salary"))
    : null;
  const housingProvided = formData.get("housing_provided") ? 1 : 0;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || name.length < 2) {
    return { error: "employees.error.nameRequired" };
  }

  const inserted = await db`
    INSERT INTO employees (farm_id, name, phone, role_title, join_date, monthly_salary, housing_provided, notes)
    VALUES (${owner.farm_id}, ${name}, ${phone}, ${roleTitle}, ${joinDate}, ${monthlySalary}, ${housingProvided}, ${notes})
    RETURNING id
  `;
  const employeeId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "employees",
    recordId: employeeId,
    summary: `Added employee: ${name}`,
    after: { name, phone, roleTitle, joinDate, monthlySalary },
  });

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployeeAction(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const roleTitle = String(formData.get("role_title") ?? "").trim() || null;
  const joinDate = String(formData.get("join_date") ?? "") || null;
  const monthlySalary = formData.get("monthly_salary")
    ? Number(formData.get("monthly_salary"))
    : null;
  const housingProvided = formData.get("housing_provided") ? 1 : 0;
  const status = String(formData.get("status") ?? "active");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || name.length < 2) {
    return { error: "employees.error.nameRequired" };
  }
  if (status !== "active" && status !== "inactive") {
    return { error: "employees.error.nameRequired" };
  }

  await db`
    UPDATE employees SET
      name = ${name}, phone = ${phone}, role_title = ${roleTitle}, join_date = ${joinDate},
      monthly_salary = ${monthlySalary}, housing_provided = ${housingProvided},
      status = ${status}, notes = ${notes}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "employees",
    recordId: id,
    summary: `Updated employee: ${name}`,
    after: { name, phone, roleTitle, joinDate, monthlySalary, status },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

export async function deleteEmployeeAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const rows = await db`SELECT name FROM employees WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  const employee = rows[0] as { name: string } | undefined;
  // Cascades salary_payments (ON DELETE CASCADE) -- fine for a mistakenly
  // added record; an employee who leaves should be set inactive via edit
  // instead of deleted, to keep their payroll history.
  await db`DELETE FROM employees WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  if (employee) {
    await logAudit({
      farmId: owner.farm_id,
      userId: owner.id,
      action: "delete",
      module: "employees",
      recordId: id,
      summary: `Deleted employee: ${employee.name}`,
      before: employee,
    });
  }
  revalidatePath("/employees");
  redirect("/employees");
}

export async function addSalaryPaymentAction(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const employeeId = Number(formData.get("employee_id"));
  const amount = Number(formData.get("amount"));
  const payPeriod = String(formData.get("pay_period") ?? "").trim();
  const status = String(formData.get("status") ?? "pending");
  const paidDate = String(formData.get("paid_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!amount || amount <= 0 || !payPeriod) {
    return { error: "employees.error.invalidPayment" };
  }
  if (status !== "pending" && status !== "paid") {
    return { error: "employees.error.invalidPayment" };
  }

  const target = await db`
    SELECT id FROM employees WHERE id = ${employeeId} AND farm_id = ${owner.farm_id}
  `;
  if (target.length === 0) {
    return { error: "employees.error.notFound" };
  }

  const inserted = await db`
    INSERT INTO salary_payments (farm_id, employee_id, amount, pay_period, status, paid_date, notes, created_by)
    VALUES (${owner.farm_id}, ${employeeId}, ${amount}, ${payPeriod}, ${status}, ${paidDate}, ${notes}, ${owner.id})
    RETURNING id
  `;
  const paymentId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "salary_payments",
    recordId: paymentId,
    summary: `Added salary payment: ${payPeriod} (${amount})`,
    after: { employeeId, amount, payPeriod, status, paidDate },
  });

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/reports");
  return {};
}

export async function markSalaryPaymentPaidAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const employeeId = Number(formData.get("employee_id"));
  const today = new Date().toISOString().slice(0, 10);

  await db`
    UPDATE salary_payments SET status = 'paid', paid_date = COALESCE(paid_date, ${today})
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;
  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "salary_payments",
    recordId: id,
    summary: "Marked salary payment paid",
    after: { status: "paid", paidDate: today },
  });
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/reports");
}

export async function deleteSalaryPaymentAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const employeeId = Number(formData.get("employee_id"));
  const rows = await db`
    SELECT amount, pay_period FROM salary_payments WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;
  const payment = rows[0] as { amount: number; pay_period: string } | undefined;
  await db`DELETE FROM salary_payments WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  if (payment) {
    await logAudit({
      farmId: owner.farm_id,
      userId: owner.id,
      action: "delete",
      module: "salary_payments",
      recordId: id,
      summary: `Deleted salary payment: ${payment.pay_period} (${payment.amount})`,
      before: payment,
    });
  }
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/reports");
}

// One row per employee per day (UNIQUE(employee_id, date) in schema.ts) --
// marking the same day again corrects it via ON CONFLICT rather than
// creating a duplicate.
export async function markAttendanceAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const employeeId = Number(formData.get("employee_id"));
  const date = String(formData.get("date") ?? "");
  const status = String(formData.get("status") ?? "") as AttendanceStatus;

  if (!employeeId || !date || !ATTENDANCE_STATUSES.includes(status)) return;

  const result = await db`
    INSERT INTO attendance (farm_id, employee_id, date, status, created_by)
    VALUES (${owner.farm_id}, ${employeeId}, ${date}, ${status}, ${owner.id})
    ON CONFLICT (employee_id, date) DO UPDATE SET status = EXCLUDED.status
    RETURNING id
  `;
  const attendanceId = (result[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "attendance",
    recordId: attendanceId,
    summary: `Marked attendance ${date}: ${status}`,
    after: { employeeId, date, status },
  });

  revalidatePath(`/employees/${employeeId}`);
}

export interface LeaveFormState {
  error?: string;
}

export async function applyLeaveAction(
  _prevState: LeaveFormState,
  formData: FormData
): Promise<LeaveFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const employeeId = Number(formData.get("employee_id"));
  const leaveType = String(formData.get("leave_type")) as LeaveType;
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!LEAVE_TYPES.includes(leaveType) || !startDate || !endDate) {
    return { error: "employees.error.invalidLeave" };
  }
  if (endDate < startDate) {
    return { error: "employees.error.invalidLeave" };
  }

  const inserted = await db`
    INSERT INTO leave_applications (farm_id, employee_id, leave_type, start_date, end_date, reason, created_by)
    VALUES (${owner.farm_id}, ${employeeId}, ${leaveType}, ${startDate}, ${endDate}, ${reason}, ${owner.id})
    RETURNING id
  `;
  const leaveId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "leave",
    recordId: leaveId,
    summary: `Applied leave: ${leaveType} ${startDate} to ${endDate}`,
    after: { employeeId, leaveType, startDate, endDate, reason },
  });

  revalidatePath(`/employees/${employeeId}`);
  return {};
}

export async function updateLeaveStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const employeeId = Number(formData.get("employee_id"));
  const status = String(formData.get("status") ?? "");
  if (status !== "approved" && status !== "rejected") return;

  await db`
    UPDATE leave_applications SET status = ${status}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "leave",
    recordId: id,
    summary: `Leave application ${status}`,
    after: { status },
  });

  revalidatePath(`/employees/${employeeId}`);
}
