import { requireOwner } from "@/lib/permissions";
import { createAssetAction } from "@/lib/actions/assets";
import { t } from "@/lib/i18n";
import AssetForm from "@/components/forms/AssetForm";

export default async function NewAssetPage() {
  const owner = await requireOwner();
  const lang = owner.language;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "assets.addAsset")}</h1>
      <AssetForm lang={lang} action={createAssetAction} />
    </div>
  );
}
