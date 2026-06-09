import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { modulesByKey, type ApiRecord, type FieldDefinition, type ModuleDefinition, type ModuleKey } from "@parking/shared";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatDate, formatDateTime, formatTime, recordTitle } from "../utils/format";
import { RecordForm } from "./RecordForm";
import { API_BASE, getModuleRecord, listModule } from "../api/client";

type DetailDrawerProps = {
  open: boolean;
  mode: "view" | "edit" | "add";
  definition: ModuleDefinition;
  record?: ApiRecord | null;
  forcedStructureId?: number;
  onClose: () => void;
  onSubmit: (payload: ApiRecord) => Promise<ApiRecord | void> | ApiRecord | void;
  onSaved?: () => void;
};

function displayValue(field: FieldDefinition, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (field.type === "time") {
    return formatTime(value);
  }
  const key = field.key;
  if (key.includes("date") || key.endsWith("_at") || key.includes("expiry")) {
    return key.endsWith("_at") ? formatDateTime(value) : formatDate(value);
  }
  if (key.includes("cost")) {
    return formatCurrency(value);
  }
  return String(value);
}

function attachmentUrl(path: unknown) {
  const value = String(path ?? "");
  if (!value) {
    return "";
  }
  if (/^https?:\/\//.test(value)) {
    return value;
  }
  return `${API_BASE.replace(/\/api$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
}

function isVisibleDetailField(field: FieldDefinition) {
  return field.table !== false || field.form !== false || field.key === "created_at" || field.key === "updated_at";
}

export function DetailDrawer({ open, mode, definition, record, forcedStructureId, onClose, onSubmit, onSaved }: DetailDrawerProps) {
  const [attachments, setAttachments] = useState<ApiRecord[]>([]);
  const [relationLabels, setRelationLabels] = useState<Record<string, string>>({});
  const detailFields = useMemo(() => definition.fields.filter(isVisibleDetailField), [definition.fields]);
  const attachmentFilters = useMemo(
    () =>
      record?.id
        ? {
            entity_type: { value: definition.route },
            entity_id: { value: String(record.id) }
          }
        : undefined,
    [definition.route, record?.id]
  );

  useEffect(() => {
    if (!open || mode !== "view" || !attachmentFilters || definition.key === "attachments") {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    listModule(modulesByKey.attachments, { pageSize: 20, filters: attachmentFilters })
      .then((result) => {
        if (!cancelled) {
          setAttachments(result.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attachmentFilters, definition.key, mode, open]);

  useEffect(() => {
    if (!open || mode !== "view" || !record) {
      setRelationLabels({});
      return;
    }
    let cancelled = false;
    const relationFields = definition.fields.filter((field) => field.relation && record[field.key]);

    Promise.all(
      relationFields.map(async (field) => {
        try {
          const related = modulesByKey[field.relation as ModuleKey];
          const result = await getModuleRecord(related, Number(record[field.key]));
          const label = String((field.relationLabel ? result.data[field.relationLabel] : undefined) ?? recordTitle(result.data));
          return [field.key, label] as const;
        } catch {
          return [field.key, ""] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setRelationLabels(Object.fromEntries(entries.filter(([, label]) => label)));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [definition.fields, mode, open, record]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const title = mode === "add" ? `New ${definition.singular}` : record ? recordTitle(record) : definition.singular;
  const isAddMode = mode === "add";

  return (
    <div
      className={`drawer-backdrop ${isAddMode ? "drawer-backdrop-modal" : ""}`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className={`detail-drawer ${isAddMode ? "detail-drawer-modal" : ""}`} aria-label={title} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <p>{definition.label}</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close panel" title="Close">
            <X size={18} />
          </button>
        </div>

        {mode === "view" && record ? (
          <>
            <div className="detail-grid">
              {detailFields.map((field) => {
                const value = field.relation ? relationLabels[field.key] ?? "" : displayValue(field, record[field.key]);
                return (
                  <div className="detail-row" key={field.key}>
                    <span>{field.label}</span>
                    {field.key === definition.statusField ? <StatusBadge value={record[field.key]} /> : <strong>{value}</strong>}
                  </div>
                );
              })}
            </div>
            {attachments.length > 0 ? (
              <section className="attachment-preview-panel">
                <h3>Attachments</h3>
                <div className="attachment-preview-grid">
                  {attachments.map((attachment) => {
                    const url = attachmentUrl(attachment.file_path);
                    const mime = String(attachment.mime_type ?? "");
                    return (
                      <article key={String(attachment.id)} className="attachment-preview-card">
                        {mime.startsWith("image/") ? <img src={url} alt={String(attachment.file_name ?? "Attachment")} /> : null}
                        {mime.startsWith("video/") ? <video src={url} controls /> : null}
                        {!mime.startsWith("image/") && !mime.startsWith("video/") ? <span>Open attachment</span> : null}
                        <strong>{String(attachment.file_name ?? "Attachment")}</strong>
                        <a href={url} target="_blank" rel="noreferrer">
                          Open attachment
                        </a>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <RecordForm
            definition={definition}
            initial={mode === "edit" ? record ?? undefined : undefined}
            forcedStructureId={forcedStructureId}
            onSubmit={onSubmit}
            onSaved={onSaved ?? onClose}
            submitLabel={mode === "add" ? "Create" : "Save changes"}
          />
        )}
      </aside>
    </div>
  );
}
