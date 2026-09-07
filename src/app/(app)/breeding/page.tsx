import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { listBreedingRecords, listIncubationBatches, listSpecies } from "@/lib/repo";
import { t, type DictKey } from "@/lib/i18n";

export default async function BreedingPage() {
  const user = await requirePermission("batches", "view");
  const lang = user.language;
  const canCreate = hasPermission(user, "batches", "create");

  const [breeding, incubation, species] = await Promise.all([
    listBreedingRecords(user.farm_id),
    listIncubationBatches(user.farm_id),
    listSpecies(),
  ]);
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
  const today = new Date().toISOString().slice(0, 10);

  const rows = [
    ...breeding.map((b) => ({
      id: b.id,
      href: `/breeding/${b.id}`,
      speciesId: b.species_id,
      label: b.dam_label || `#${b.id}`,
      date: b.bred_date,
      dueDate: b.expected_due_date,
      statusKey: `breeding.status.${b.status}` as DictKey,
      active: b.status === "bred" || b.status === "confirmed_pregnant",
    })),
    ...incubation.map((i) => ({
      id: i.id,
      href: `/breeding/incubation/${i.id}`,
      speciesId: i.species_id,
      label: `#${i.id} (${i.egg_count ?? "?"} ${t(lang, "breeding.eggs")})`,
      date: i.start_date,
      dueDate: i.expected_hatch_date,
      statusKey: `breeding.incubationStatus.${i.status}` as DictKey,
      active: i.status === "incubating",
    })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "breeding.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "breeding.subtitle")}</p>
        </div>
        {canCreate && (
          <Link href="/breeding/new" className="btn-primary">
            + {t(lang, "breeding.new")}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-muted">{t(lang, "breeding.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.species")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "breeding.record")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "breeding.due")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sp = speciesById[r.speciesId];
                const overdue = r.active && r.dueDate != null && r.dueDate < today;
                return (
                  <tr key={r.href} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">
                      {sp ? `${sp.icon} ${lang === "bn" ? sp.name_bn : sp.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={r.href} className="font-medium text-primary hover:underline">
                        {r.label}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted">{r.date}</td>
                    <td className={`px-4 py-2 ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                      {r.dueDate || "—"}
                    </td>
                    <td className="px-4 py-2 text-muted">{t(lang, r.statusKey)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
