import { deleteAttachmentAction } from "@/lib/actions/attachments";
import { t } from "@/lib/i18n";
import type { AttachmentRow, Language } from "@/lib/types";
import ConfirmForm from "@/components/forms/ConfirmForm";

export default function AttachmentCell({
  lang,
  attachments,
  relatedTable,
  returnPath,
  canDelete,
}: {
  lang: Language;
  attachments: AttachmentRow[] | undefined;
  relatedTable: string;
  returnPath: string;
  canDelete: boolean;
}) {
  if (!attachments || attachments.length === 0) return <span className="text-muted">—</span>;

  return (
    <div className="flex flex-col gap-1">
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center gap-2 whitespace-nowrap">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            📎 {t(lang, "attachments.view")}
          </a>
          {canDelete && (
            <ConfirmForm
              action={deleteAttachmentAction}
              hiddenFields={{ id: a.id, related_table: relatedTable, return_path: returnPath }}
              confirmMessage={t(lang, "common.confirmDelete")}
            >
              <button type="submit" className="text-xs text-danger hover:underline">
                {t(lang, "attachments.remove")}
              </button>
            </ConfirmForm>
          )}
        </div>
      ))}
    </div>
  );
}
