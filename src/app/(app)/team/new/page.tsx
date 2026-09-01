import { requireOwner } from "@/lib/permissions";
import { createTeamMemberAction } from "@/lib/actions/team";
import { t } from "@/lib/i18n";
import TeamMemberForm from "@/components/forms/TeamMemberForm";

export default async function NewTeamMemberPage() {
  const owner = await requireOwner();
  const lang = owner.language;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t(lang, "team.new")}</h1>
      <TeamMemberForm lang={lang} action={createTeamMemberAction} />
    </div>
  );
}
