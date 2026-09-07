import { requireOwner } from "@/lib/permissions";
import { listAuditLog } from "@/lib/repo";
import { t, type DictKey } from "@/lib/i18n";

const ACTION_STYLE: Record<string, string> = {
  create: "bg-primary/10 text-primary",
  update: "bg-accent/10 text-accent",
  delete: "bg-danger/10 text-danger",
};

export default async function AuditPage() {
  const owner = await requireOwner();
  const lang = owner.language;
  const entries = await listAuditLog(owner.farm_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(lang, "audit.title")}</h1>
        <p className="text-sm text-muted">{t(lang, "audit.subtitle")}</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted">{t(lang, "audit.empty")}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">{t(lang, "audit.when")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "audit.who")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "audit.action")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "audit.module")}</th>
                <th className="px-4 py-2 font-medium">{t(lang, "audit.details")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">{e.created_at}</td>
                  <td className="px-4 py-2">{e.user_name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_STYLE[e.action] ?? "bg-muted/20 text-muted"
                      }`}
                    >
                      {t(lang, `audit.action.${e.action}` as DictKey)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted">{e.module}</td>
                  <td className="px-4 py-2">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
