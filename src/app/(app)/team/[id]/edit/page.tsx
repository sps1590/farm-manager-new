import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/permissions";
import { getTeamMember } from "@/lib/repo";
import { updateTeamMemberAction } from "@/lib/actions/team";
import { t } from "@/lib/i18n";
import TeamMemberForm from "@/components/forms/TeamMemberForm";
import { RESERVED_OWNER_ROLE } from "@/lib/types";

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = await requireOwner();
  const lang = owner.language;
  const member = await getTeamMember(Number(id), owner.farm_id);
  if (!member || member.role === RESERVED_OWNER_ROLE) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "team.edit")}</h1>
      <TeamMemberForm lang={lang} action={updateTeamMemberAction} member={member} />
    </div>
  );
}
