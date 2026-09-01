import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listBatches, listSpecies } from "@/lib/repo";
import { t } from "@/lib/i18n";

export default async function BatchesPage() {
  const user = await getSessionUser();
  const lang = user!.language;
  const batches = await listBatches();
  const species = await listSpecies();
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "batches.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "batches.subtitle")}</p>
        </div>
        <Link href="/batches/new" className="btn-primary">
          + {t(lang, "batches.new")}
        </Link>
      </div>

      {batches.length === 0 ? (
        <p className="text-muted">{t(lang, "batches.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "common.species")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "batches.name")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "batches.breed")}</th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "batches.currentQuantity")}
                </th>
                <th className="px-4 py-2 font-medium">{t(lang, "common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const sp = speciesById[b.species_id];
                return (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {sp?.icon} {sp ? (lang === "bn" ? sp.name_bn : sp.name_en) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/batches/${b.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted">{b.breed || "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {b.current_quantity} {sp ? (lang === "bn" ? sp.unit_bn : sp.unit_en) : ""}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/20 text-muted"
                        }`}
                      >
                        {t(lang, b.status === "active" ? "common.active" : "common.closed")}
                      </span>
                    </td>
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
