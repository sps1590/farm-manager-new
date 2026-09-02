import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listPartners, getFarm } from "@/lib/repo";
import { updateFarmReserveAction } from "@/lib/actions/partners";
import { t } from "@/lib/i18n";

export default async function PartnersPage() {
  const user = await requireUser();
  const lang = user.language;

  if (user.role !== "owner") {
    if (user.is_partner) redirect(`/partners/${user.id}`);
    redirect("/dashboard");
  }

  const [partners, farm] = await Promise.all([
    listPartners(user.farm_id),
    getFarm(user.farm_id),
  ]);
  const reserve = farm?.profit_reserve_percent ?? 0;
  const totalInvested = partners.reduce(
    (sum, p) => sum + Math.max(0, p.netInvestment),
    0
  );
  const totalShare = partners.reduce((sum, p) => sum + p.profitSharePercent, 0);
  const distributable = 100 - reserve;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t(lang, "partners.title")}
          </h1>
          <p className="text-sm text-muted">{t(lang, "partners.subtitle")}</p>
        </div>
        <Link href="/partners/new" className="btn-primary">
          + {t(lang, "partners.addPartner")}
        </Link>
      </div>

      <div className="card space-y-3 p-4">
        <form
          action={updateFarmReserveAction}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="label" htmlFor="profit_reserve_percent">
              {t(lang, "partners.companyReserve")}
            </label>
            <input
              id="profit_reserve_percent"
              name="profit_reserve_percent"
              type="number"
              step="any"
              min="0"
              max="100"
              defaultValue={reserve}
              className="input w-32"
            />
          </div>
          <button type="submit" className="btn-secondary">
            {t(lang, "common.save")}
          </button>
        </form>
        <p className="text-xs text-muted">{t(lang, "partners.companyReserveHint")}</p>

        <div className="grid grid-cols-2 gap-4 pt-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">{t(lang, "partners.totalInvested")}</p>
            <p className="font-semibold text-foreground">
              {t(lang, "common.currency")}
              {totalInvested}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">{t(lang, "partners.distributable")}</p>
            <p className="font-semibold text-foreground">{distributable}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t(lang, "partners.totalAllocated")}</p>
            <p
              className={`font-semibold ${
                Math.round(totalShare) === Math.round(distributable)
                  ? "text-primary"
                  : "text-danger"
              }`}
            >
              {totalShare}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">{t(lang, "partners.partnerCount")}</p>
            <p className="font-semibold text-foreground">{partners.length}</p>
          </div>
        </div>
      </div>

      {partners.length === 0 ? (
        <p className="text-muted">{t(lang, "partners.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "team.memberName")}</th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "partners.netInvestment")}
                </th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "partners.ownershipPercent")}
                </th>
                <th className="px-4 py-2 font-medium text-right">
                  {t(lang, "partners.profitSharePercent")}
                </th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {t(lang, "common.currency")}
                    {p.netInvestment}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.ownershipPercent.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right">{p.profitSharePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
