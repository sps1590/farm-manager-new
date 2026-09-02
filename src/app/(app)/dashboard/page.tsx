import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  dashboardSummary,
  listUpcomingMedical,
  recentActivity,
  listSpecies,
  listPartners,
  getPartner,
} from "@/lib/repo";
import { t } from "@/lib/i18n";
function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const lang = user.language;
  const summary = await dashboardSummary(user.farm_id);
  const upcoming = await listUpcomingMedical(user.farm_id, 14);
  const activity = await recentActivity(user.farm_id, 8);
  const speciesList = await listSpecies();
  const speciesById = Object.fromEntries(speciesList.map((s) => [s.id, s]));

  const ownerPartners = user.role === "owner" ? await listPartners(user.farm_id) : null;
  const ownPartnership = user.is_partner ? await getPartner(user.id, user.farm_id) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t(lang, "dashboard.title")}
        </h1>
        <p className="text-sm text-muted">{t(lang, "dashboard.subtitle")}</p>
      </div>

      {ownerPartners && (
        <div className="card flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary p-4">
          <div>
            <h2 className="font-semibold text-foreground">
              🤝 {t(lang, "partners.title")}
            </h2>
            <p className="text-sm text-muted">
              {t(lang, "partners.totalInvested")}:{" "}
              <span className="font-medium text-foreground">
                {t(lang, "common.currency")}
                {fmtAmount(
                  ownerPartners.reduce((sum, p) => sum + Math.max(0, p.netInvestment), 0)
                )}
              </span>
              {" · "}
              {t(lang, "partners.partnerCount")}:{" "}
              <span className="font-medium text-foreground">{ownerPartners.length}</span>
            </p>
          </div>
          <Link href="/partners" className="btn-secondary text-sm">
            {t(lang, "partners.viewAll")} →
          </Link>
        </div>
      )}

      {ownPartnership && (
        <div className="card flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary p-4">
          <div>
            <h2 className="font-semibold text-foreground">
              🤝 {t(lang, "partners.yourPartnership")}
            </h2>
            <p className="text-sm text-muted">
              {t(lang, "partners.netInvestment")}:{" "}
              <span className="font-medium text-foreground">
                {t(lang, "common.currency")}
                {fmtAmount(ownPartnership.netInvestment)}
              </span>
              {" · "}
              {t(lang, "partners.ownershipPercent")}:{" "}
              <span className="font-medium text-foreground">
                {ownPartnership.ownershipPercent.toFixed(1)}%
              </span>
              {" · "}
              {t(lang, "partners.profitSharePercent")}:{" "}
              <span className="font-medium text-foreground">
                {ownPartnership.profitSharePercent}%
              </span>
            </p>
          </div>
          <Link href={`/partners/${user.id}`} className="btn-secondary text-sm">
            {t(lang, "partners.viewAll")} →
          </Link>
        </div>
      )}

      {summary.length === 0 ? (
        <p className="text-muted">{t(lang, "dashboard.noSpecies")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((row) => {
            const net = row.sales30d - row.purchases30d;
            return (
              <div key={row.species.id} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{row.species.icon}</span>
                  <h2 className="font-semibold text-foreground">
                    {lang === "bn" ? row.species.name_bn : row.species.name_en}
                  </h2>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted">{t(lang, "dashboard.activeBatches")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {row.activeBatches}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.currentStock")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {fmtAmount(row.currentStock)}{" "}
                    {lang === "bn" ? row.species.unit_bn : row.species.unit_en}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.last30Purchases")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {t(lang, "common.currency")}{fmtAmount(row.purchases30d)}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.last30Sales")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {t(lang, "common.currency")}{fmtAmount(row.sales30d)}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.net30")}</dt>
                  <dd
                    className={`text-right font-semibold ${
                      net >= 0 ? "text-primary" : "text-danger"
                    }`}
                  >
                    {t(lang, "common.currency")}{fmtAmount(net)}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-foreground">
            {t(lang, "dashboard.upcomingMedical")}
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "dashboard.noUpcoming")}</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{m.title}</span>
                  <span className="text-muted">{m.next_due_date}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/medical" className="mt-3 inline-block text-sm font-medium text-primary">
            {t(lang, "nav.medical")} →
          </Link>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-foreground">
            {t(lang, "dashboard.recentActivity")}
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "dashboard.noActivity")}</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => {
                const sp = a.species_id ? speciesById[a.species_id] : undefined;
                return (
                  <li
                    key={`${a.kind}-${a.id}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">
                      {a.kind === "sale" ? "💰" : "🛒"} {a.item_name}
                      {sp ? ` · ${lang === "bn" ? sp.name_bn : sp.name_en}` : ""}
                    </span>
                    <span
                      className={
                        a.kind === "sale" ? "text-primary font-medium" : "text-muted"
                      }
                    >
                      {a.kind === "sale" ? "+" : "-"}
                      {t(lang, "common.currency")}
                      {fmtAmount(a.total_amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
