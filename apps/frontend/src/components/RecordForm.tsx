import { modulesByKey, type ApiRecord, type FieldDefinition, type ModuleDefinition, type ModuleKey } from "@parking/shared";
import { useEffect, useMemo, useState } from "react";
import { createModuleRecord, getModuleRecord, listModule, uploadAttachment } from "../api/client";
import { TimePickerField } from "./forms/TimePickerField";
import { ALL_LEVELS_OPTION, fileKey, initialValue, parseLevels } from "./forms/recordFormUtils";
import { formatDisplayLabel, humanize, recordTitle } from "../utils/format";

type RecordFormProps = {
  definition: ModuleDefinition;
  initial?: ApiRecord;
  forcedStructureId?: number;
  onSubmit: (payload: ApiRecord) => Promise<ApiRecord | void> | ApiRecord | void;
  onSaved?: () => void;
  submitLabel?: string;
};

type RelationOptions = Record<string, ApiRecord[]>;

const cleaningReminderModules = new Set(["cleaningLogs", "elevatorCleaningLogs"]);

function nextReminderDate(dateValue: unknown, frequencyValue: unknown) {
  const source = String(dateValue ?? "");
  if (!source) {
    return "";
  }
  const date = new Date(`${source.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const frequency = String(frequencyValue ?? "").toLowerCase();
  if (frequency.includes("annual")) {
    date.setFullYear(date.getFullYear() + 1);
  } else if (frequency.includes("quarter")) {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency.includes("month")) {
    date.setMonth(date.getMonth() + 1);
  } else {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function RecordForm({ definition, initial, forcedStructureId, onSubmit, onSaved, submitLabel = "Save" }: RecordFormProps) {
  const editableFields = useMemo(
    () => definition.fields.filter((field) => field.form !== false && field.key !== "created_at" && field.key !== "updated_at"),
    [definition]
  );
  const [values, setValues] = useState<ApiRecord>(() =>
    Object.fromEntries([
      ...editableFields.map((field) => [field.key, initialValue(field, initial, forcedStructureId)]),
      ...(definition.key === "parkingSpaces" && !initial ? [["quantity", "1"]] : [])
    ])
  );
  const [relationOptions, setRelationOptions] = useState<RelationOptions>({});
  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [mapFiles, setMapFiles] = useState<File[]>([]);
  const [scheduleNextReminder, setScheduleNextReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const structureValue = forcedStructureId ?? Number(values.structure_id || 0);
  const canScheduleCleaningReminder = cleaningReminderModules.has(definition.key) && Boolean(values.frequency);
  const canUploadMaps = definition.key === "structures";

  useEffect(() => {
    const relationFields = editableFields.filter((field) => field.relation);
    let cancelled = false;

    async function loadRelationOptions() {
      const entries = await Promise.all(
        relationFields.map(async (field) => {
          const key = field.relation as ModuleKey;
          const related = modulesByKey[key];
          const filters = related.supportsStructure && structureValue ? { structure_id: { value: String(structureValue) } } : undefined;
          const result = await listModule(related, { pageSize: 100, filters });
          return [field.key, result.data] as const;
        })
      );
      if (!cancelled) {
        setRelationOptions(Object.fromEntries(entries));
      }
    }

    loadRelationOptions().catch(() => {
      if (!cancelled) {
        setRelationOptions({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [editableFields, structureValue]);

  useEffect(() => {
    let cancelled = false;

    async function loadLevels() {
      if (!structureValue || !editableFields.some((field) => field.optionsFrom === "levels")) {
        setLevelOptions([]);
        return;
      }
      const structure = await getModuleRecord(modulesByKey.structures, Number(structureValue));
      let levels = parseLevels(structure.data.levels);
      if (levels.length === 0) {
        const result = await listModule(modulesByKey.parkingSpaces, { pageSize: 100, filters: { structure_id: { value: String(structureValue) } } });
        levels = result.data.map((record) => String(record.level ?? "").trim()).filter(Boolean);
      }
      levels = Array.from(new Set([ALL_LEVELS_OPTION, ...levels])).sort((a, b) => {
        if (a === ALL_LEVELS_OPTION) {
          return -1;
        }
        if (b === ALL_LEVELS_OPTION) {
          return 1;
        }
        return a.localeCompare(b);
      });
      if (!cancelled) {
        setLevelOptions(levels);
      }
    }

    loadLevels().catch(() => {
      if (!cancelled) {
        setLevelOptions([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [editableFields, structureValue]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await onSubmit(values);
      const savedRecord = (saved && typeof saved === "object" ? saved : initial) as ApiRecord | undefined;
      async function uploadFiles(selectedFiles: File[], attachmentType: string) {
        if (selectedFiles.length === 0) {
          return;
        }
        const structureId =
          definition.key === "structures"
            ? Number(savedRecord?.id ?? initial?.id)
            : Number(forcedStructureId ?? values.structure_id ?? savedRecord?.structure_id ?? initial?.structure_id);
        const entityId = Number(savedRecord?.id ?? initial?.id);
        if (entityId) {
          const form = new FormData();
          selectedFiles.forEach((file) => form.append("files", file));
          if (structureId) {
            form.append("structure_id", String(structureId));
          }
          form.append("entity_type", definition.route);
          form.append("entity_id", String(entityId));
          form.append("attachment_type", attachmentType);
          form.append("before_after", "not applicable");
          await uploadAttachment(form);
        }
      }

      await uploadFiles(files, "photo");
      await uploadFiles(mapFiles, "map");
      setFiles([]);
      setMapFiles([]);

      if (canScheduleCleaningReminder && scheduleNextReminder) {
        const reminderDate = nextReminderDate(values.completed_date || values.scheduled_date, values.frequency);
        const entityId = Number(savedRecord?.id ?? initial?.id);
        if (reminderDate && entityId) {
          await createModuleRecord(modulesByKey.reminders, {
            structure_id: Number(forcedStructureId ?? values.structure_id ?? savedRecord?.structure_id ?? initial?.structure_id) || null,
            entity_type: definition.route,
            entity_id: entityId,
            title: `Next ${definition.singular.toLowerCase()}`,
            message: `Auto-created from ${definition.singular.toLowerCase()} frequency.`,
            event_type: "follow up",
            reminder_type: definition.key === "elevatorCleaningLogs" ? "elevator cleaning" : "cleaning",
            reminder_date: reminderDate,
            reminder_time: reminderTime,
            frequency: "once",
            status: "scheduled",
            source: "cleaning frequency",
            notes: `Created from ${String(values.frequency).toLowerCase()} frequency.`
          });
        }
      }
      onSaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save record";
      setError(message);
      window.alert(message);
    } finally {
      setSaving(false);
    }
  }

  function addFiles(selectedFiles: FileList | null) {
    const incoming = Array.from(selectedFiles ?? []);
    if (incoming.length === 0) {
      return;
    }
    setFiles((current) => {
      const existing = new Set(current.map(fileKey));
      const additions = incoming.filter((file) => !existing.has(fileKey(file)));
      return [...current, ...additions];
    });
  }

  function setValue(key: string, value: string) {
    setValues((current) => {
      return { ...current, [key]: value };
    });
  }

  function optionLabel(field: FieldDefinition, record: ApiRecord) {
    const labelKey = field.relationLabel;
    return String((labelKey ? record[labelKey] : undefined) ?? recordTitle(record));
  }

  async function handleRelationChange(field: FieldDefinition, value: string) {
    if (field.relation === "vendors" && value === "__other__") {
      const vendorName = window.prompt("Enter a name for the new vendor");
      const name = vendorName?.trim();
      if (!name) {
        return;
      }
      try {
        const result = await createModuleRecord(modulesByKey.vendors, { name, status: "active" });
        setRelationOptions((current) => ({
          ...current,
          [field.key]: [...(current[field.key] ?? []), result.data]
        }));
        setValue(field.key, String(result.data.id ?? ""));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create vendor");
      }
      return;
    }
    setValue(field.key, value);
  }

  function renderInput(field: FieldDefinition, value: ApiRecord[string]) {
    if (field.relation) {
      const options = relationOptions[field.key] ?? [];
      const hasCurrent = value !== "" && value !== undefined && value !== null && !options.some((option) => String(option.id) === String(value));
      return (
        <select value={String(value)} onChange={(event) => handleRelationChange(field, event.target.value)}>
          <option value="">{field.required ? `Select ${field.label}` : "Not assigned"}</option>
          {hasCurrent ? <option value={String(value)}>{String(value)}</option> : null}
          {options.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {optionLabel(field, option)}
            </option>
          ))}
          {field.relation === "vendors" ? <option value="__other__">Other (add vendor)</option> : null}
        </select>
      );
    }

    if (field.optionsFrom === "levels") {
      const hasCurrent = value !== "" && value !== undefined && value !== null && !levelOptions.includes(String(value));
      return (
        <select value={String(value)} onChange={(event) => setValue(field.key, event.target.value)}>
          <option value="">Not assigned</option>
          {hasCurrent ? <option value={String(value)}>{String(value)}</option> : null}
          {levelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return <textarea value={String(value)} onChange={(event) => setValue(field.key, event.target.value)} rows={4} />;
    }

    if (field.type === "enum") {
      const hasCustomOption = value !== "" && value !== undefined && value !== null && !(field.enumValues ?? []).includes(String(value));
      return (
        <select
          value={String(value)}
          onChange={(event) => {
            const selected = event.target.value;
            if (selected.toLowerCase() === "other") {
              const customType = window.prompt(`Enter the ${field.label.toLowerCase()} name`);
              const customValue = customType?.trim();
              if (customValue) {
                setValue(field.key, customValue);
              }
              return;
            }
            setValue(field.key, selected);
          }}
        >
          {hasCustomOption ? <option value={String(value)}>{humanize(String(value))}</option> : null}
          {(field.enumValues ?? []).map((option) => (
            <option key={option} value={option}>
              {humanize(option)}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "time") {
      return <TimePickerField value={value} onChange={(nextValue) => setValue(field.key, nextValue)} />;
    }

    return (
      <input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "text"}
        placeholder={field.placeholder}
        value={String(value)}
        onChange={(event) => setValue(field.key, event.target.value)}
      />
    );
  }

  return (
    <form className="record-form" onSubmit={submit}>
      {editableFields.map((field) => {
        if (field.key === "structure_id" && forcedStructureId) {
          return <input key={field.key} type="hidden" value={forcedStructureId} />;
        }
        const value = values[field.key] ?? "";
        return (
          <label key={field.key} className={field.type === "textarea" ? "form-field form-field-wide" : "form-field"}>
            <span>
              {formatDisplayLabel(field.label)}
              {field.required ? <strong> *</strong> : null}
            </span>
            {renderInput(field, value)}
          </label>
        );
      })}
      <div className="form-field form-field-wide attachment-picker">
        <span>Attachments (optional images/videos)</span>
        <div className="attachment-picker-row">
          <label className="secondary-file-button">
            {files.length > 0 ? "Add more" : "Add images/videos"}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <strong>{files.length === 0 ? "No files selected" : files.length === 1 ? "1 file selected" : `${files.length} files selected`}</strong>
        </div>
        {files.length > 0 ? (
          <div className="selected-file-list">
            {files.map((file) => (
              <span key={fileKey(file)}>{file.name}</span>
            ))}
          </div>
        ) : null}
      </div>
      {canUploadMaps ? (
        <div className="form-field form-field-wide attachment-picker">
          <span>Structure maps (optional images/videos)</span>
          <div className="attachment-picker-row">
            <label className="secondary-file-button">
              {mapFiles.length > 0 ? "Add more maps" : "Add maps"}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(event) => {
                  const incoming = Array.from(event.target.files ?? []);
                  setMapFiles((current) => {
                    const existing = new Set(current.map(fileKey));
                    const additions = incoming.filter((file) => !existing.has(fileKey(file)));
                    return [...current, ...additions];
                  });
                  event.target.value = "";
                }}
              />
            </label>
            <strong>{mapFiles.length === 0 ? "No maps selected" : mapFiles.length === 1 ? "1 map selected" : `${mapFiles.length} maps selected`}</strong>
          </div>
          {mapFiles.length > 0 ? (
            <div className="selected-file-list">
              {mapFiles.map((file) => (
                <span key={fileKey(file)}>{file.name}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {canScheduleCleaningReminder ? (
        <div className="form-field form-field-wide reminder-option-row">
          <label>
            <input type="checkbox" checked={scheduleNextReminder} onChange={(event) => setScheduleNextReminder(event.target.checked)} />
            Schedule reminder for next {String(values.frequency).toLowerCase()} cleaning
          </label>
          {scheduleNextReminder ? <TimePickerField value={reminderTime} onChange={setReminderTime} /> : null}
        </div>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}
      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Saving" : submitLabel}
      </button>
    </form>
  );
}
