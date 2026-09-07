import { get } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { MODULE_BY_RELATED_TABLE } from "@/lib/attachments";

// Attachments are stored as private Vercel Blob objects -- this is the only
// way to read one back, so a farm's receipts/vet-bill photos are never a
// bare guessable public link, matching the app's farm-scoped data-isolation
// convention everywhere else.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  const rows = await db`
    SELECT related_table, url, filename FROM attachments
    WHERE id = ${Number(id)} AND farm_id = ${user.farm_id}
  `;
  const row = rows[0] as { related_table: string; url: string; filename: string } | undefined;
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const moduleName = MODULE_BY_RELATED_TABLE[row.related_table];
  if (!moduleName || !hasPermission(user, moduleName, "view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const result = await get(row.url, { access: "private" });
  if (!result || !result.stream) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
    },
  });
}
