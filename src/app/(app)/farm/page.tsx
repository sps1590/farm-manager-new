import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { getFarm, listSpecies, getEnabledSpeciesIds } from "@/lib/repo";
import { updateFarmDetailsAction, setEnabledSpeciesAction } from "@/lib/actions/farm";
import { t } from "@/lib/i18n";

export default async function FarmProfilePage() {
  const owner = await requireOwner();
  const lang = owner.language;

  const [farm, allSpecies, enabledIds] = await Promise.all([
    getFarm(owner.farm_id),
    listSpecies(),
    getEnabledSpeciesIds(owner.farm_id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "farm.title")}</h1>
        <p className="text-sm text-muted">{t(lang, "farm.subtitle")}</p>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t(lang, "farm.details")}</h2>
        <form action={updateFarmDetailsAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              {t(lang, "register.farmName")}
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={farm?.name}
              className="input"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contact_email">
                {t(lang, "register.email")}
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={farm?.contact_email ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="contact_phone">
                {t(lang, "register.phone")}
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                defaultValue={farm?.contact_phone ?? ""}
                className="input"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            {t(lang, "common.save")}
          </button>
        </form>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t(lang, "farm.businessTypes")}</h2>
        <p className="text-sm text-muted">{t(lang, "farm.businessTypesHint")}</p>
        <form action={setEnabledSpeciesAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allSpecies.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="species_ids"
                  value={s.id}
                  defaultChecked={enabledIds.has(s.id)}
                />
                <span>
                  {s.icon} {lang === "bn" ? s.name_bn : s.name_en}
                </span>
              </label>
            ))}
          </div>
          <button type="submit" className="btn-secondary">
            {t(lang, "common.save")}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">{t(lang, "farm.setup")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link href="/team" className="card p-4 hover:bg-background">
            <p className="font-semibold text-foreground">👥 {t(lang, "nav.team")}</p>
          </Link>
          <Link href="/partners" className="card p-4 hover:bg-background">
            <p className="font-semibold text-foreground">🤝 {t(lang, "nav.partners")}</p>
          </Link>
          <Link href="/employees" className="card p-4 hover:bg-background">
            <p className="font-semibold text-foreground">🧑‍🌾 {t(lang, "nav.employees")}</p>
          </Link>
          <Link href="/reports" className="card p-4 hover:bg-background">
            <p className="font-semibold text-foreground">📈 {t(lang, "nav.reports")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
