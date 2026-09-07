import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  dashboardSummary,
  listUpcomingMedical,
  listPendingSalaryAlerts,
  listUpcomingTasks,
  listUpcomingBreedingEvents,
  recentActivity,
  listSpecies,
  listPartners,
  getPartner,
  getFarm,
} from "@/lib/repo";
import { t, roleLabel } from "@/lib/i18n";
import { formatCurrency, formatQuantity } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const lang = user.language;
  const [
    farm,
    summary,
    upcoming,
    salaryAlerts,
    taskAlerts,
    breedingAlerts,
    activity,
    speciesList,
    ownerPartners,
    ownPartnership,
  ] = await Promise.all([
    getFarm(user.farm_id),
    dashboardSummary(user.farm_id),
    listUpcomingMedical(user.farm_id, 14),
    user.role === "owner" ? listPendingSalaryAlerts(user.farm_id) : Promise.resolve([]),
    listUpcomingTasks(user.farm_id, user.id, user.role === "owner"),
    listUpcomingBreedingEvents(user.farm_id),
    recentActivity(user.farm_id, 8),
    listSpecies(),
    user.role === "owner" ? listPartners(user.farm_id) : Promise.resolve(null),
    user.is_partner ? getPartner(user.id, user.farm_id) : Promise.resolve(null),
  ]);
  const speciesById = Object.fromEntries(speciesList.map((s) => [s.id, s]));

  const alerts = [
    ...upcoming.map((m) => ({
      key: `medical-${m.id}`,
      icon: "💉",
      label: m.title,
      meta: m.next_due_date ?? "",
      href: "/medical",
    })),
    ...salaryAlerts.map((s) => ({
      key: `salary-${s.id}`,
      icon: "💰",
      label: `${s.employee_name} — ${s.pay_period}`,
      meta: `${t(lang, "common.currency")}${formatCurrency(s.amount)}`,
      href: `/employees/${s.employee_id}`,
    })),
    ...taskAlerts.map((task) => ({
      key: `task-${task.id}`,
      icon: "📋",
      label: task.title,
      meta: task.due_date,
      href: "/tasks",
    })),
    ...breedingAlerts.map((b) => ({
      key: b.key,
      icon: b.kind === "birth" ? "🐣" : "🥚",
      label: b.label,
      meta: b.dueDate,
      href: b.href,
    })),
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {t(lang, "dashboard.title")}
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          {farm?.name ?? t(lang, "dashboard.title")}
        </h1>
        <p className="text-sm text-muted">
          {user.name} · {roleLabel(user.role, lang)}
        </p>
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
                {formatCurrency(
                  ownerPartners
                    .filter((p) => p.status === "active")
                    .reduce((sum, p) => sum + Math.max(0, p.netInvestment), 0)
                )}
              </span>
              {" · "}
              {t(lang, "partners.partnerCount")}:{" "}
              <span className="font-medium text-foreground">
                {ownerPartners.filter((p) => p.status === "active").length}
              </span>
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
                {formatCurrency(ownPartnership.netInvestment)}
              </span>
              {" · "}
              {t(lang, "partners.ownershipPercent")}:{" "}
              <span className="font-medium text-foreground">
                {ownPartnership.ownershipPercent.toFixed(1)}%
              </span>
              {" · "}
              {t(lang, "partners.profitSharePercent")}:{" "}
              <span
                className={`font-medium ${
                  ownPartnership.profitShareAmount < 0
                    ? "text-danger"
                    : "text-foreground"
                }`}
              >
                {ownPartnership.profitSharePercent.toFixed(1)}% ({t(lang, "common.currency")}
                {formatCurrency(ownPartnership.profitShareAmount)})
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
                    {formatQuantity(row.currentStock)}{" "}
                    {lang === "bn" ? row.species.unit_bn : row.species.unit_en}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.last30Purchases")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {t(lang, "common.currency")}{formatCurrency(row.purchases30d)}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.last30Sales")}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {t(lang, "common.currency")}{formatCurrency(row.sales30d)}
                  </dd>
                  <dt className="text-muted">{t(lang, "dashboard.net30")}</dt>
                  <dd
                    className={`text-right font-semibold ${
                      net >= 0 ? "text-primary" : "text-danger"
                    }`}
                  >
                    {t(lang, "common.currency")}{formatCurrency(net)}
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
            {t(lang, "dashboard.alerts")}
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "dashboard.noAlerts")}</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a.key}>
                  <Link
                    href={a.href}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover"
                  >
                    <span className="text-foreground">
                      {a.icon} {a.label}
                    </span>
                    <span className="text-muted">{a.meta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
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
                      {formatCurrency(a.total_amount)}
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
