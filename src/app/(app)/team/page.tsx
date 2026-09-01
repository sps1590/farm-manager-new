import Link from "next/link";
import { requireOwner } from "@/lib/permissions";
import { listTeamMembers } from "@/lib/repo";
import { deleteTeamMemberAction } from "@/lib/actions/team";
import { t } from "@/lib/i18n";
import ConfirmForm from "@/components/forms/ConfirmForm";
import { RESERVED_OWNER_ROLE } from "@/lib/types";

export default async function TeamPage() {
  const owner = await requireOwner();
  const lang = owner.language;
  const members = await listTeamMembers(owner.farm_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(lang, "team.title")}</h1>
          <p className="text-sm text-muted">{t(lang, "team.subtitle")}</p>
        </div>
        <Link href="/team/new" className="btn-primary">
          + {t(lang, "team.new")}
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2 font-medium">{t(lang, "register.yourName")}</th>
              <th className="px-4 py-2 font-medium">{t(lang, "team.role")}</th>
              <th className="px-4 py-2 font-medium">{t(lang, "login.username")}</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium text-foreground">{m.name}</td>
                <td className="px-4 py-2 capitalize text-muted">{m.role}</td>
                <td className="px-4 py-2 text-muted">
                  {m.email || m.phone || m.username || "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {m.role !== RESERVED_OWNER_ROLE && (
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/team/${m.id}/edit`}
                        className="text-xs text-primary hover:underline"
                      >
                        {t(lang, "common.edit")}
                      </Link>
                      <ConfirmForm
                        action={deleteTeamMemberAction}
                        hiddenFields={{ id: m.id }}
                        confirmMessage={t(lang, "common.confirmDelete")}
                      >
                        <button type="submit" className="text-xs text-danger hover:underline">
                          {t(lang, "common.delete")}
                        </button>
                      </ConfirmForm>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
