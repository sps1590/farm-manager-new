"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireOwner } from "../permissions";

export async function updateFarmDetailsAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();

  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  if (!name || name.length < 2) return;

  await db`
    UPDATE farms SET name = ${name}, contact_email = ${contactEmail}, contact_phone = ${contactPhone}
    WHERE id = ${owner.farm_id}
  `;
  revalidatePath("/farm");
  revalidatePath("/", "layout");
}

// Empty submission is ignored -- guards against the owner accidentally
// unchecking every species and breaking every dropdown app-wide.
export async function setEnabledSpeciesAction(formData: FormData) {
  const owner = await requireOwner();
  const db = await getDb();

  const speciesIds = formData
    .getAll("species_ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  if (speciesIds.length === 0) return;

  await db`DELETE FROM farm_species WHERE farm_id = ${owner.farm_id}`;
  for (const speciesId of speciesIds) {
    await db`INSERT INTO farm_species (farm_id, species_id) VALUES (${owner.farm_id}, ${speciesId})`;
  }
  revalidatePath("/farm");
  revalidatePath("/batches/new");
  revalidatePath("/purchases/new");
  revalidatePath("/sales/new");
  revalidatePath("/medical/new");
  revalidatePath("/dashboard");
}
