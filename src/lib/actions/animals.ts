"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requirePermission } from "../permissions";
import { logAudit } from "../audit";
import type { AnimalSex, AnimalStatus } from "../types";

const SEXES: AnimalSex[] = ["male", "female", "unknown"];
const STATUSES: AnimalStatus[] = ["active", "sold", "dead", "culled"];

export interface AnimalFormState {
  error?: string;
}

export async function createAnimalAction(
  _prevState: AnimalFormState,
  formData: FormData
): Promise<AnimalFormState> {
  const user = await requirePermission("batches", "create");
  const db = await getDb();

  const batchId = Number(formData.get("batch_id"));
  const speciesId = Number(formData.get("species_id"));
  const tag = String(formData.get("tag") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const sex = String(formData.get("sex") ?? "unknown") as AnimalSex;
  const birthDate = String(formData.get("birth_date") ?? "") || null;
  const breed = String(formData.get("breed") ?? "").trim() || null;

  if (!tag) {
    return { error: "animals.error.tagRequired" };
  }
  if (!SEXES.includes(sex)) {
    return { error: "animals.error.tagRequired" };
  }

  const dupe = await db`
    SELECT 1 FROM animals WHERE farm_id = ${user.farm_id} AND tag = ${tag}
  `;
  if (dupe.length > 0) {
    return { error: "animals.error.duplicateTag" };
  }

  const inserted = await db`
    INSERT INTO animals (farm_id, batch_id, species_id, tag, name, sex, birth_date, breed, created_by)
    VALUES (${user.farm_id}, ${batchId}, ${speciesId}, ${tag}, ${name}, ${sex}, ${birthDate}, ${breed}, ${user.id})
    RETURNING id
  `;
  const animalId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "animals",
    recordId: animalId,
    summary: `Added animal: ${tag}`,
    after: { tag, name, sex, birthDate, breed },
  });

  revalidatePath(`/batches/${batchId}`);
  return {};
}

export async function addAnimalWeightAction(
  _prevState: AnimalFormState,
  formData: FormData
): Promise<AnimalFormState> {
  const user = await requirePermission("batches", "create");
  const db = await getDb();

  const animalId = Number(formData.get("animal_id"));
  const weighDate = String(formData.get("weigh_date") ?? "");
  const weight = Number(formData.get("weight") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!weighDate || !weight || weight <= 0) {
    return { error: "animals.error.weightRequired" };
  }

  const animalRows = await db`
    SELECT tag FROM animals WHERE id = ${animalId} AND farm_id = ${user.farm_id}
  `;
  if (animalRows.length === 0) {
    return { error: "animals.error.weightRequired" };
  }

  await db`
    INSERT INTO animal_weights (farm_id, animal_id, weigh_date, weight, notes, created_by)
    VALUES (${user.farm_id}, ${animalId}, ${weighDate}, ${weight}, ${notes}, ${user.id})
  `;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "create",
    module: "animals",
    recordId: animalId,
    summary: `Recorded weight for ${(animalRows[0] as { tag: string }).tag}: ${weight}`,
    after: { weighDate, weight },
  });

  revalidatePath(`/animals/${animalId}`);
  return {};
}

export async function updateAnimalStatusAction(formData: FormData) {
  const user = await requirePermission("batches", "edit");
  const db = await getDb();

  const animalId = Number(formData.get("animal_id"));
  const status = String(formData.get("status") ?? "") as AnimalStatus;
  const statusDate = String(formData.get("status_date") ?? "") || null;
  const statusNotes = String(formData.get("status_notes") ?? "").trim() || null;

  if (!STATUSES.includes(status)) redirect(`/animals/${animalId}`);

  await db`
    UPDATE animals SET status = ${status}, status_date = ${statusDate}, status_notes = ${statusNotes}
    WHERE id = ${animalId} AND farm_id = ${user.farm_id}
  `;

  await logAudit({
    farmId: user.farm_id,
    userId: user.id,
    action: "update",
    module: "animals",
    recordId: animalId,
    summary: `Animal status set to ${status}`,
    after: { status, statusDate },
  });

  revalidatePath(`/animals/${animalId}`);
  redirect(`/animals/${animalId}`);
}

export async function deleteAnimalAction(formData: FormData) {
  const user = await requirePermission("batches", "delete");
  const db = await getDb();
  const id = Number(formData.get("id"));
  const batchId = Number(formData.get("batch_id"));

  const rows = await db`SELECT tag FROM animals WHERE id = ${id} AND farm_id = ${user.farm_id}`;
  const animal = rows[0] as { tag: string } | undefined;

  await db`DELETE FROM animals WHERE id = ${id} AND farm_id = ${user.farm_id}`;

  if (animal) {
    await logAudit({
      farmId: user.farm_id,
      userId: user.id,
      action: "delete",
      module: "animals",
      recordId: id,
      summary: `Deleted animal: ${animal.tag}`,
      before: animal,
    });
  }

  revalidatePath(`/batches/${batchId}`);
  redirect(`/batches/${batchId}`);
}
