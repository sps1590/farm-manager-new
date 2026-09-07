import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import { getAsset } from "@/lib/repo";
import { updateAssetAction } from "@/lib/actions/assets";
import { t } from "@/lib/i18n";
import AssetForm from "@/components/forms/AssetForm";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = await requireOwner();
  const lang = owner.language;
  const asset = await getAsset(Number(id), owner.farm_id);
  if (!asset) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "assets.editAsset")}</h1>
      <AssetForm lang={lang} action={updateAssetAction} asset={asset} />
    </div>
  );
}
