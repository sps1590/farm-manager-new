"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import { logAudit } from "../audit";
import type { BreedingMethod, BreedingStatus, IncubationMethod, IncubationStatus } from "../types";

const BREEDING_METHODS: BreedingMethod[] = ["natural", "ai"];
const BREEDING_STATUSES: BreedingStatus[] = [
  "bred",
  "confirmed_pregnant",
  "not_pregnant",
  "birthed",
  "lost",
];
const INCUBATION_METHODS: IncubationMethod[] = ["broody", "incubator"];
const INCUBATION_STATUSES: IncubationStatus[] = ["incubating", "hatched", "failed"];

export interface BreedingFormState {
  error?: string;
}

export async function createBreedingRecordAction(
  _prevState: BreedingFormState,
  formData: FormData
): Promise<BreedingFormState> {
  const user = await requirePermission("batches", "create");
  const db = await getDb();

  const speciesId = Number(formData.get("species_id"));
  const batchId = formData.get("batch_id") ? Number(formData.get("batch_id")) : null;
  const damAnimalId = formData.get("dam_animal_id")
    ? Number(formData.get("dam_animal_id"))
    : null;
  const damLabel = String(formData.get("dam_label") ?? "").trim() || null;
  const sireLabel = String(formData.get("sire_label") ?? "").trim() || null;
  const method = String(formData.get("method") ?? "natural") as BreedingMethod;
  const bredDate = String(formData.get("bred_date") ?? "");
  const expectedDueDate = String(formData.get("expected_due_date") ?? "") || null;

  if (!speciesId || !bredDate) {
    return { error: "breeding.error.dateRequired" };
  }
  if (!BREEDING_METHODS.includes(method)) {
    return { error: "breeding.error.dateRequired" };
  }

  const inserted = await db`
    INSERT INTO breeding_records
      (farm_id, species_id, batch_id, dam_animal_id, dam_label, sire_label, method, bred_date, expected_due_date, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${damAnimalId}, ${damLabel}, ${sireLabel}, ${method}, ${bredDate}, ${expectedDueDate}, ${user.id})
    RETURNING id
  `;
  const recordId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "breeding",
    recordId,
    summary: `Recorded breeding: ${damLabel || `#${recordId}`}`,
    after: { damLabel, sireLabel, method, bredDate, expectedDueDate },
  });

  revalidatePath("/breeding");
  revalidatePath("/dashboard");
  redirect("/breeding");
}

export async function updateBreedingStatusAction(formData: FormData) {
  const user = await requirePermission("batches", "edit");
  const db = await getDb();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as BreedingStatus;
  const birthDate = String(formData.get("birth_date") ?? "") || null;
  const offspringCount = formData.get("offspring_count")
    ? Number(formData.get("offspring_count"))
    : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!BREEDING_STATUSES.includes(status)) redirect(`/breeding/${id}`);

  await db`
    UPDATE breeding_records SET
      status = ${status}, birth_date = ${birthDate}, offspring_count = ${offspringCount}, notes = ${notes}
    WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "update",
    module: "breeding",
    recordId: id,
    summary: `Breeding record status set to ${status}`,
    after: { status, birthDate, offspringCount },
  });

  revalidatePath(`/breeding/${id}`);
  revalidatePath("/breeding");
  revalidatePath("/dashboard");
  redirect(`/breeding/${id}`);
}

export async function deleteBreedingRecordAction(formData: FormData) {
  const user = await requirePermission("batches", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`SELECT dam_label FROM breeding_records WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  const record = rows[0] as { dam_label: string | null } | undefined;

  await db`DELETE FROM breeding_records WHERE id = ${id} AND farm_id = ${user.farm_id}`;

  if (record) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "breeding",
      recordId: id,
      summary: `Deleted breeding record: ${record.dam_label || `#${id}`}`,
      before: record,
    });
  }

  revalidatePath("/breeding");
  revalidatePath("/dashboard");
  redirect("/breeding");
}

export async function createIncubationAction(
  _prevState: BreedingFormState,
  formData: FormData
): Promise<BreedingFormState> {
  const user = await requirePermission("batches", "create");
  const db = await getDb();

  const speciesId = Number(formData.get("species_id"));
  const batchId = formData.get("batch_id") ? Number(formData.get("batch_id")) : null;
  const method = String(formData.get("method") ?? "broody") as IncubationMethod;
  const eggCount = formData.get("egg_count") ? Number(formData.get("egg_count")) : null;
  const startDate = String(formData.get("start_date") ?? "");
  const expectedHatchDate = String(formData.get("expected_hatch_date") ?? "") || null;

  if (!speciesId || !startDate) {
    return { error: "breeding.error.dateRequired" };
  }
  if (!INCUBATION_METHODS.includes(method)) {
    return { error: "breeding.error.dateRequired" };
  }

  const inserted = await db`
    INSERT INTO incubation_batches
      (farm_id, species_id, batch_id, method, egg_count, start_date, expected_hatch_date, created_by)
    VALUES (${user.farm_id}, ${speciesId}, ${batchId}, ${method}, ${eggCount}, ${startDate}, ${expectedHatchDate}, ${user.id})
    RETURNING id
  `;
  const batchRecordId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "breeding",
    recordId: batchRecordId,
    summary: `Started incubation: #${batchRecordId} (${eggCount ?? "?"} eggs)`,
    after: { method, eggCount, startDate, expectedHatchDate },
  });

  revalidatePath("/breeding");
  revalidatePath("/dashboard");
  redirect("/breeding");
}

export async function updateIncubationStatusAction(formData: FormData) {
  const user = await requirePermission("batches", "edit");
  const db = await getDb();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as IncubationStatus;
  const hatchDate = String(formData.get("hatch_date") ?? "") || null;
  const hatchedCount = formData.get("hatched_count")
    ? Number(formData.get("hatched_count"))
    : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!INCUBATION_STATUSES.includes(status)) redirect(`/breeding/incubation/${id}`);

  await db`
    UPDATE incubation_batches SET
      status = ${status}, hatch_date = ${hatchDate}, hatched_count = ${hatchedCount}, notes = ${notes}
    WHERE id = ${id} AND farm_id = ${user.farm_id}
  `;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "update",
    module: "breeding",
    recordId: id,
    summary: `Incubation status set to ${status}`,
    after: { status, hatchDate, hatchedCount },
  });

  revalidatePath(`/breeding/incubation/${id}`);
  revalidatePath("/breeding");
  revalidatePath("/dashboard");
  redirect(`/breeding/incubation/${id}`);
}

export async function deleteIncubationAction(formData: FormData) {
  const user = await requirePermission("batches", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));

  const rows = await db`SELECT egg_count FROM incubation_batches WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  const record = rows[0] as { egg_count: number | null } | undefined;

  await db`DELETE FROM incubation_batches WHERE id = ${id} AND farm_id = ${user.farm_id}`;

  if (record) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "breeding",
      recordId: id,
      summary: `Deleted incubation batch: #${id}`,
      before: record,
    });
  }

  revalidatePath("/breeding");
  revalidatePath("/dashboard");
  redirect("/breeding");
}
