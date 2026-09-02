import { requireOwner } from "@/lib/permissions";
import { t } from "@/lib/i18n";
import NewPartnerForm from "@/components/forms/NewPartnerForm";

export default async function NewPartnerPage() {
  const owner = await requireOwner();
  const lang = owner.language;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        {t(lang, "partners.addPartner")}
      </h1>
      <NewPartnerForm lang={lang} />
    </div>
  );
}
