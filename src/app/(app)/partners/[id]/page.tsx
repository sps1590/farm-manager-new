import { notFound } from "next/navigation";
import { requireOwnerOrSelf } from "@/lib/permissions";
import { getPartner, listPartnerEntries } from "@/lib/repo";
import {
  deleteInvestmentEntryAction,
  updatePartnerProfitShareAction,
  deactivatePartnerAction,
  reactivatePartnerAction,
} from "@/lib/actions/partners";
import { t, type DictKey } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import PartnerInvestmentForm from "@/components/forms/PartnerInvestmentForm";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partnerId = Number(id);
  const user = await requireOwnerOrSelf(partnerId);
  const lang = user.language;
  const isOwner = user.role === "owner";

  const partner = await getPartner(partnerId, user.farm_id);
  if (!partner) notFound();
  const entries = await listPartnerEntries(partnerId, user.farm_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{partner.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                partner.status === "active"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/20 text-muted"
              }`}
            >
              {t(lang, `partners.status.${partner.status}` as DictKey)}
            </span>
          </div>
          <p className="text-sm text-muted">
            {partner.email || partner.phone || "—"}
          </p>
        </div>
        {isOwner &&
          (partner.status === "active" ? (
            <ConfirmForm
              action={deactivatePartnerAction}
              hiddenFields={{ partner_id: partner.id }}
              confirmMessage={t(lang, "partners.confirmDeactivate")}
            >
              <button type="submit" className="btn-secondary text-sm text-danger">
                {t(lang, "partners.deactivate")}
              </button>
            </ConfirmForm>
          ) : (
            <form action={reactivatePartnerAction}>
              <input type="hidden" name="partner_id" value={partner.id} />
              <button type="submit" className="btn-secondary text-sm">
                {t(lang, "partners.reactivate")}
              </button>
            </form>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "partners.netInvestment")}</p>
          <p className="text-lg font-semibold text-foreground">
            {t(lang, "common.currency")}
            {partner.netInvestment}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">{t(lang, "partners.ownershipPercent")}</p>
          <p className="text-lg font-semibold text-foreground">
            {partner.ownershipPercent.toFixed(1)}%
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">
            {t(lang, "partners.profitSharePercent")}
          </p>
          <p className="text-lg font-semibold text-foreground">
            {partner.profitSharePercent}%
          </p>
        </div>
      </div>

      {isOwner && (
        <div className="card space-y-3 p-4">
          <p className="label">{t(lang, "partners.setShare")}</p>
          <form
            action={updatePartnerProfitShareAction}
            className="flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="partner_id" value={partner.id} />
            <input
              name="profit_share_percent"
              type="number"
              step="any"
              min="0"
              max="100"
              defaultValue={partner.profitSharePercent}
              className="input w-32"
            />
            <button type="submit" className="btn-secondary">
              {t(lang, "common.save")}
            </button>
          </form>
        </div>
      )}

      {isOwner && (
        <div>
          <p className="label mb-2">{t(lang, "partners.addEntry")}</p>
          <PartnerInvestmentForm lang={lang} partnerId={partner.id} />
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold text-foreground">
          {t(lang, "partners.ledger")}
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "partners.noEntries")}</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">{t(lang, "common.date")}</th>
                  <th className="px-4 py-2 font-medium">
                    {t(lang, "partners.entryType")}
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t(lang, "partners.amount")}
                  </th>
                  <th className="px-4 py-2 font-medium">{t(lang, "common.notes")}</th>
                  {isOwner && <th className="px-4 py-2 font-medium" />}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted">{e.entry_date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          e.entry_type === "contribution"
                            ? "text-primary"
                            : "text-danger"
                        }
                      >
                        {t(lang, `partners.entryType.${e.entry_type}` as DictKey)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {e.entry_type === "withdrawal" ? "-" : "+"}
                      {t(lang, "common.currency")}
                      {e.amount}
                    </td>
                    <td className="px-4 py-2 text-muted">{e.notes || "—"}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <ConfirmForm
                          action={deleteInvestmentEntryAction}
                          hiddenFields={{ id: e.id, partner_id: partner.id }}
                          confirmMessage={t(lang, "common.confirmDelete")}
                        >
                          <button
                            type="submit"
                            className="text-xs text-danger hover:underline"
                          >
                            {t(lang, "common.delete")}
                          </button>
                        </ConfirmForm>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
