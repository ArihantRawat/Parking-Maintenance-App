import { modulesByKey, type ApiRecord, type FieldDefinition, type ModuleDefinition, type ModuleKey } from "@parking/shared";
import { useEffect, useMemo, useState } from "react";
import { createModuleRecord, getModuleRecord, listModule, uploadAttachment } from "../api/client";
import { recordTitle } from "../utils/format";

type RecordFormProps = {
  definition: ModuleDefinition;
  initial?: ApiRecord;
  forcedStructureId?: number;
  onSubmit: (payload: ApiRecord) => Promise<ApiRecord | void> | ApiRecord | void;
  submitLabel?: string;
};

type RelationOptions = Record<string, ApiRecord[]>;

function parseLevels(value: unknown) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((level) => level.trim())
    .filter(Boolean);
}

function initialValue(field: FieldDefinition, record?: ApiRecord, forcedStructureId?: number) {
  if (field.key === "structure_id" && forcedStructureId) {
    return forcedStructureId;
  }
  if (record?.[field.key] !== undefined && record?.[field.key] !== null) {
    return record[field.key];
  }
  if (field.type === "number") {
    return "";
  }
  if (field.type === "enum") {
    return field.enumValues?.[0] ?? "";
  }
  return "";
}

export function RecordForm({ definition, initial, forcedStructureId, onSubmit, submitLabel = "Save" }: RecordFormProps) {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const structureValue = forcedStructureId ?? Number(values.structure_id || 0);

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
      levels = Array.from(new Set(levels)).sort();
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
      if (files.length > 0) {
        const structureId =
          definition.key === "structures"
            ? Number(savedRecord?.id ?? initial?.id)
            : Number(forcedStructureId ?? values.structure_id ?? savedRecord?.structure_id ?? initial?.structure_id);
        const entityId = Number(savedRecord?.id ?? initial?.id);
        if (structureId && entityId) {
          const form = new FormData();
          files.forEach((file) => form.append("files", file));
          form.append("structure_id", String(structureId));
          form.append("entity_type", definition.route);
          form.append("entity_id", String(entityId));
          form.append("attachment_type", "photo");
          form.append("before_after", "not applicable");
          await uploadAttachment(form);
          setFiles([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  function setValue(key: string, value: string) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (definition.key === "cleaningLogs" && value && (key === "space_id" || key === "level")) {
        next.cleaning_scope = "area";
      }
      return next;
    });
  }

  function optionLabel(field: FieldDefinition, record: ApiRecord) {
    const labelKey = field.relationLabel;
    return String((labelKey ? record[labelKey] : undefined) ?? recordTitle(record));
  }

  async function handleRelationChange(field: FieldDefinition, value: string) {
    if (field.relation === "vendors" && value === "__other__") {
      const vendorName = window.prompt("Enter the new vendor name");
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
        setError(err instanceof Error ? err.message : "Unable to create vendor.");
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
          {field.relation === "vendors" ? <option value="__other__">Other - add vendor</option> : null}
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
            if ((field.key === "type" || field.key === "sign_type" || field.key === "stripping_type" || field.key === "item_type") && event.target.value.toLowerCase() === "other") {
              const customType = window.prompt("Enter the type name");
              setValue(field.key, customType?.trim() || event.target.value);
              return;
            }
            setValue(field.key, event.target.value);
          }}
        >
          {hasCustomOption ? <option value={String(value)}>{String(value)}</option> : null}
          {(field.enumValues ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
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
              {field.label}
              {field.required ? <strong> *</strong> : null}
            </span>
            {renderInput(field, value)}
          </label>
        );
      })}
      {definition.key === "parkingSpaces" && !initial ? (
        <label className="form-field">
          <span>Quantity</span>
          <input type="number" min="1" value={String(values.quantity ?? "1")} onChange={(event) => setValue("quantity", event.target.value)} />
        </label>
      ) : null}
      <label className="form-field form-field-wide">
        <span>Attachments (optional images/videos)</span>
        <input type="file" multiple accept="image/*,video/*" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
      </label>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Saving" : submitLabel}
      </button>
    </form>
  );
}
