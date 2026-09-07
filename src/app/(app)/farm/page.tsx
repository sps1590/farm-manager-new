import Link from "next/link";
import { Users, Handshake, UserCog, LineChart, type LucideIcon } from "lucide-react";
import { requireOwner } from "@/lib/permissions";
import {
  getFarm,
  listSpecies,
  getEnabledSpeciesIds,
  getIndividualTrackingSpeciesIds,
  listExpenseCategories,
  listIncomeHeads,
} from "@/lib/repo";
import {
  updateFarmDetailsAction,
  setEnabledSpeciesAction,
  setIndividualTrackingAction,
} from "@/lib/actions/farm";
import {
  createExpenseCategoryAction,
  toggleExpenseCategoryStatusAction,
  createIncomeHeadAction,
  toggleIncomeHeadStatusAction,
} from "@/lib/actions/categories";
import { t, type DictKey } from "@/lib/i18n";
import CategoryManager from "@/components/forms/CategoryManager";

const SETUP_LINKS: Array<{ href: string; labelKey: DictKey; icon: LucideIcon }> = [
  { href: "/team", labelKey: "nav.team", icon: Users },
  { href: "/partners", labelKey: "nav.partners", icon: Handshake },
  { href: "/employees", labelKey: "nav.employees", icon: UserCog },
  { href: "/reports", labelKey: "nav.reports", icon: LineChart },
];

export default async function FarmProfilePage() {
  const owner = await requireOwner();
  const lang = owner.language;

  const [farm, allSpecies, enabledIds, trackingIds, expenseCategories, incomeHeads] =
    await Promise.all([
      getFarm(owner.farm_id),
      listSpecies(),
      getEnabledSpeciesIds(owner.farm_id),
      getIndividualTrackingSpeciesIds(owner.farm_id),
      listExpenseCategories(owner.farm_id),
      listIncomeHeads(owner.farm_id),
    ]);
  const enabledSpeciesList = allSpecies.filter((s) => enabledIds.has(s.id));

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

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t(lang, "animals.trackingTitle")}</h2>
        <p className="text-sm text-muted">{t(lang, "animals.trackingHint")}</p>
        {enabledSpeciesList.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "animals.trackingNoSpecies")}</p>
        ) : (
          <form action={setIndividualTrackingAction} className="space-y-3">
            {enabledSpeciesList.map((s) => (
              <input key={s.id} type="hidden" name="all_species_ids" value={s.id} />
            ))}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {enabledSpeciesList.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="tracked_species_ids"
                    value={s.id}
                    defaultChecked={trackingIds.has(s.id)}
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
        )}
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t(lang, "categories.expenseTitle")}</h2>
        <p className="text-sm text-muted">{t(lang, "categories.expenseHint")}</p>
        <CategoryManager
          lang={lang}
          categories={expenseCategories}
          createAction={createExpenseCategoryAction}
          toggleAction={toggleExpenseCategoryStatusAction}
        />
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{t(lang, "categories.incomeTitle")}</h2>
        <p className="text-sm text-muted">{t(lang, "categories.incomeHint")}</p>
        <CategoryManager
          lang={lang}
          categories={incomeHeads}
          createAction={createIncomeHeadAction}
          toggleAction={toggleIncomeHeadStatusAction}
        />
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-foreground">{t(lang, "farm.setup")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SETUP_LINKS.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="card flex items-center gap-3 p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={18} />
              </div>
              <p className="font-semibold text-foreground">{t(lang, labelKey)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
