"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";

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

  await db`
    INSERT INTO employees (farm_id, name, phone, role_title, join_date, monthly_salary, housing_provided, notes)
    VALUES (${owner.farm_id}, ${name}, ${phone}, ${roleTitle}, ${joinDate}, ${monthlySalary}, ${housingProvided}, ${notes})
  `;

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

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

export async function deleteEmployeeAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  // Cascades salary_payments (ON DELETE CASCADE) -- fine for a mistakenly
  // added record; an employee who leaves should be set inactive via edit
  // instead of deleted, to keep their payroll history.
  await db`DELETE FROM employees WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
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

  await db`
    INSERT INTO salary_payments (farm_id, employee_id, amount, pay_period, status, paid_date, notes, created_by)
    VALUES (${owner.farm_id}, ${employeeId}, ${amount}, ${payPeriod}, ${status}, ${paidDate}, ${notes}, ${owner.id})
  `;

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
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/reports");
}

export async function deleteSalaryPaymentAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const employeeId = Number(formData.get("employee_id"));
  await db`DELETE FROM salary_payments WHERE id = ${id} AND farm_id = ${owner.farm_id}`;
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/reports");
}
