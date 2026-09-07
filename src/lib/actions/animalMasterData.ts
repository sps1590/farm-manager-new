"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";
import { logAudit } from "../audit";
import type { CategoryFormState } from "./categories";

export async function createAnimalBreedAction(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const speciesId = Number(formData.get("species_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "animals.error.nameRequired" };
  }

  const dupe = await db`
    SELECT 1 FROM animal_breeds WHERE farm_id = ${owner.farm_id} AND species_id = ${speciesId} AND name = ${name}
  `;
  if (dupe.length > 0) {
    return { error: "animals.error.duplicate" };
  }

  const inserted = await db`
    INSERT INTO animal_breeds (farm_id, species_id, name)
    VALUES (${owner.farm_id}, ${speciesId}, ${name})
    RETURNING id
  `;
  const breedId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "animal_breeds",
    recordId: breedId,
    summary: `Added breed: ${name}`,
    after: { speciesId, name },
  });

  revalidatePath("/farm");
  return {};
}

export async function toggleAnimalBreedStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) === "active" ? "active" : "inactive";

  await db`
    UPDATE animal_breeds SET status = ${status}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "animal_breeds",
    recordId: id,
    summary: `Breed set to ${status}`,
    after: { status },
  });

  revalidatePath("/farm");
}

export async function createAnimalGroupAction(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const owner = await requireOwner();
  const db = await getDb();

  const speciesId = Number(formData.get("species_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "animals.error.nameRequired" };
  }

  const dupe = await db`
    SELECT 1 FROM animal_groups WHERE farm_id = ${owner.farm_id} AND species_id = ${speciesId} AND name = ${name}
  `;
  if (dupe.length > 0) {
    return { error: "animals.error.duplicate" };
  }

  const inserted = await db`
    INSERT INTO animal_groups (farm_id, species_id, name)
    VALUES (${owner.farm_id}, ${speciesId}, ${name})
    RETURNING id
  `;
  const groupId = (inserted[0] as { id: number }).id;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "create",
    module: "animal_groups",
    recordId: groupId,
    summary: `Added group: ${name}`,
    after: { speciesId, name },
  });

  revalidatePath("/farm");
  return {};
}

export async function toggleAnimalGroupStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) === "active" ? "active" : "inactive";

  await db`
    UPDATE animal_groups SET status = ${status}
    WHERE id = ${id} AND farm_id = ${owner.farm_id}
  `;

  await logAudit({
    farmId: owner.farm_id,
    userId: owner.id,
    action: "update",
    module: "animal_groups",
    recordId: id,
    summary: `Group set to ${status}`,
    after: { status },
  });

  revalidatePath("/farm");
}
