import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Archive, ArrowDown, ArrowUp, Download, Edit3, ExternalLink, Mail, Plus, RefreshCw, Search } from "lucide-react";
import { modulesByKey, type ApiRecord, type FieldDefinition, type ModuleDefinition, type ModuleKey } from "@parking/shared";
import { archiveModuleRecord, bulkCreateSpaces, createModuleRecord, getModuleRecord, listModule, sendReminderEmail, updateModuleRecord } from "../api/client";
import { formatCurrency, formatDate, formatDateTime, recordTitle } from "../utils/format";
import { StatusBadge } from "./StatusBadge";
import { DetailDrawer } from "./DetailDrawer";
import { EmptyState } from "./EmptyState";

type AdvancedTableProps = {
  definition: ModuleDefinition;
  title?: string;
  structureId?: number;
  compact?: boolean;
};

type FilterState = Record<string, { value?: string; min?: string; max?: string; from?: string; to?: string }>;
type FilterOption = { value: string; label: string };
type FilterOptions = Record<string, FilterOption[]>;
type RelationMap = Record<string, Record<string, string>>;

function parseLevels(value: unknown) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((level) => level.trim())
    .filter(Boolean);
}

type DrawerState = {
  open: boolean;
  mode: "view" | "edit" | "add";
  record?: ApiRecord | null;
};

type EditingCell = {
  id: number;
  key: string;
  value: string;
};

const defaultMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
};

function tableStorageKey(definition: ModuleDefinition, structureId?: number) {
  return `parking-table:${definition.key}:${structureId ?? "global"}`;
}

function cleanFilters(filters: FilterState, allowedKeys: Set<string>, structureId?: number): FilterState {
  const output: FilterState = {};
  for (const [key, value] of Object.entries(filters)) {
    if (allowedKeys.has(key) && Object.values(value).some((entry) => entry !== undefined && entry !== "")) {
      output[key] = value;
    }
  }
  if (structureId) {
    output.structure_id = { value: String(structureId) };
  }
  return output;
}

function valueForInput(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, select, textarea"));
}

function displayCell(field: FieldDefinition, value: unknown, relationMap: RelationMap): ReactNode {
  if (field.key === "file_path" && value) {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer">
        {String(value)}
      </a>
    );
  }
  if (field.type === "date") {
    return formatDate(value);
  }
  if (field.type === "datetime" || field.key.endsWith("_at")) {
    return formatDateTime(value);
  }
  if (field.key.includes("cost")) {
    return formatCurrency(value);
  }
  if (field.relation && value !== undefined && value !== null && value !== "") {
    return relationMap[field.key]?.[String(value)] ?? String(value);
  }
  if (field.type === "number") {
    return String(value ?? "");
  }
  return String(value ?? "");
}

function downloadCsv(definition: ModuleDefinition, rows: ApiRecord[], fields: FieldDefinition[]) {
  const headers = fields.map((field) => field.key);
  const labels = fields.map((field) => field.label);
  const lines = [
    labels.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const raw = row[key] ?? "";
          return `"${String(raw).replaceAll('"', '""')}"`;
        })
        .join(",")
    )
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${definition.route}-filtered.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function FilterControl({
  field,
  value,
  onChange,
  options
}: {
  field: FieldDefinition;
  value: FilterState[string] | undefined;
  onChange: (value: FilterState[string]) => void;
  options?: FilterOption[];
}) {
  if (!field.filter) {
    return null;
  }
  if (field.filter === "enum" || field.key === "level" || options?.length) {
    return (
      <label className="filter-control">
        <span>{field.label}</span>
        <select value={value?.value ?? ""} onChange={(event) => onChange({ value: event.target.value })}>
          <option value="">{field.key === "structure_id" ? "All structures" : "All"}</option>
          {(options ?? (field.enumValues ?? []).map((option) => ({ value: option, label: option }))).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.filter === "date") {
    return (
      <label className="filter-control filter-pair">
        <span>{field.label}</span>
        <div>
          <input type="date" value={value?.from ?? ""} onChange={(event) => onChange({ ...value, from: event.target.value })} />
          <input type="date" value={value?.to ?? ""} onChange={(event) => onChange({ ...value, to: event.target.value })} />
        </div>
      </label>
    );
  }
  if (field.filter === "number") {
    return (
      <label className="filter-control filter-pair">
        <span>{field.label}</span>
        <div>
          <input type="number" placeholder="Min" value={value?.min ?? ""} onChange={(event) => onChange({ ...value, min: event.target.value })} />
          <input type="number" placeholder="Max" value={value?.max ?? ""} onChange={(event) => onChange({ ...value, max: event.target.value })} />
        </div>
      </label>
    );
  }
  return (
    <label className="filter-control">
      <span>{field.label}</span>
      <input value={value?.value ?? ""} onChange={(event) => onChange({ value: event.target.value })} />
    </label>
  );
}

export function AdvancedTable({ definition, title, structureId, compact }: AdvancedTableProps) {
  const storageKey = tableStorageKey(definition, structureId);
  const storedState = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<{
        search: string;
        filters: FilterState;
        sortBy: string;
        sortDir: "asc" | "desc";
        pageSize: number;
      }>;
    } catch {
      return {};
    }
  }, [storageKey]);
  const initialFilters = useMemo(() => {
    const next = { ...(storedState.filters ?? {}) };
    if (!structureId) {
      delete next.structure_id;
    }
    return next;
  }, [storedState.filters, structureId]);

  const tableFields = useMemo(
    () => definition.fields.filter((field) => field.table !== false && !(structureId && field.key === "structure_id")),
    [definition, structureId]
  );
  const filterFields = useMemo(
    () => definition.fields.filter((field) => field.filter && !(structureId && field.key === "structure_id")),
    [definition, structureId]
  );

  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [meta, setMeta] = useState(defaultMeta);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(storedState.pageSize ?? 20);
  const [search, setSearch] = useState(storedState.search ?? "");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sortBy, setSortBy] = useState(storedState.sortBy ?? definition.defaultSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(storedState.sortDir ?? "desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, mode: "view" });
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [relationMap, setRelationMap] = useState<RelationMap>({});

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listModule(definition, {
        page,
        pageSize,
        search,
        sortBy,
        sortDir,
        filters: cleanFilters(filters, new Set(filterFields.map((field) => field.key)), structureId)
      });
      setRows(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [definition, filterFields, filters, page, pageSize, search, sortBy, sortDir, structureId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ search, filters, sortBy, sortDir, pageSize }));
  }, [filters, pageSize, search, sortBy, sortDir, storageKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const optionEntries: Array<[string, FilterOption[]]> = [];
      const relationEntries: Array<[string, Record<string, string>]> = [];
      const optionFields = [...tableFields, ...filterFields].filter((field, index, fields) => fields.findIndex((item) => item.key === field.key) === index);

      for (const field of optionFields) {
        if (field.relation) {
          const related = modulesByKey[field.relation as ModuleKey];
          const relatedFilters = related.supportsStructure && structureId ? { structure_id: { value: String(structureId) } } : undefined;
          const result = await listModule(related, { pageSize: 100, filters: relatedFilters });
          const options = result.data.map((record) => ({
            value: String(record.id),
            label: String((field.relationLabel ? record[field.relationLabel] : undefined) ?? recordTitle(record))
          }));
          optionEntries.push([field.key, options]);
          relationEntries.push([field.key, Object.fromEntries(options.map((option) => [option.value, option.label]))]);
        }

        if (definition.key === "structures" && ["name", "location"].includes(field.key)) {
          const result = await listModule(definition, { pageSize: 100 });
          const options = Array.from(new Set(result.data.map((record) => String(record[field.key] ?? "")).filter(Boolean))).map((value) => ({ value, label: value }));
          optionEntries.push([field.key, options]);
        }

        if (field.key === "level" || field.optionsFrom === "levels") {
          let levelValues: string[] = [];
          if (structureId) {
            const structure = await getModuleRecord(modulesByKey.structures, structureId);
            levelValues = parseLevels(structure.data.levels);
          } else {
            const structures = await listModule(modulesByKey.structures, { pageSize: 100 });
            levelValues = structures.data.flatMap((record) => parseLevels(record.levels));
          }
          if (levelValues.length === 0) {
            const result = await listModule(definition, {
              pageSize: 100,
              filters: structureId && definition.supportsStructure ? { structure_id: { value: String(structureId) } } : undefined
            });
            levelValues = result.data.map((record) => String(record[field.key] ?? "")).filter(Boolean);
          }
          const options = Array.from(new Set(levelValues)).map((value) => ({ value, label: value }));
          if (options.length > 0) {
            optionEntries.push([field.key, options]);
          }
          continue;
        }

        if (field.key === "space_number") {
          const result = await listModule(definition, {
            pageSize: 100,
            filters: structureId && definition.supportsStructure ? { structure_id: { value: String(structureId) } } : undefined
          });
          const options = Array.from(new Set(result.data.map((record) => String(record[field.key] ?? "")).filter(Boolean))).map((value) => ({ value, label: value }));
          if (options.length > 0) {
            optionEntries.push([field.key, options]);
          }
        }
      }

      if (!cancelled) {
        setFilterOptions(Object.fromEntries(optionEntries));
        setRelationMap(Object.fromEntries(relationEntries));
      }
    }

    loadOptions().catch(() => {
      if (!cancelled) {
        setFilterOptions({});
        setRelationMap({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [definition, filterFields, structureId, tableFields]);

  function updateFilter(key: string, value: FilterState[string]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function toggleSort(key: string) {
    if (sortBy === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  async function saveDrawer(payload: ApiRecord) {
    if (structureId && definition.supportsStructure) {
      payload.structure_id = structureId;
    }
    if (drawer.mode === "add" && definition.key === "parkingSpaces" && Number(payload.quantity ?? 1) > 1) {
      const baseName = String(payload.space_number ?? "").trim();
      const bulkPayload: ApiRecord = {
        structure_id: payload.structure_id,
        prefix: baseName,
        startNumber: 1,
        count: Number(payload.quantity),
        padLength: 0,
        labelPrefix: baseName || "Space",
        level: payload.level,
        area: payload.area,
        type: payload.type,
        condition: payload.condition,
        status: payload.status,
        notes: payload.notes
      };
      const result = await bulkCreateSpaces(bulkPayload);
      setDrawer({ open: false, mode: "view" });
      loadRows();
      return result.data[0];
    }
    delete payload.quantity;
    let saved: ApiRecord;
    if (drawer.mode === "edit" && drawer.record?.id) {
      const result = await updateModuleRecord(definition, Number(drawer.record.id), payload);
      saved = result.data;
    } else {
      const result = await createModuleRecord(definition, payload);
      saved = result.data;
    }
    setDrawer({ open: false, mode: "view" });
    loadRows();
    return saved;
  }

  async function commitEdit() {
    if (!editing) {
      return;
    }
    const field = definition.fields.find((item) => item.key === editing.key);
    if (!field) {
      return;
    }
    await updateModuleRecord(definition, editing.id, { [editing.key]: editing.value });
    setEditing(null);
    loadRows();
  }

  async function archiveRow(row: ApiRecord) {
    if (!window.confirm(`Archive or deactivate ${definition.singular} "${recordTitle(row)}"?`)) {
      return;
    }
    await archiveModuleRecord(definition, Number(row.id));
    loadRows();
  }

  async function sendReminder(row: ApiRecord) {
    const existingEmail = String(row.email_to ?? "").trim();
    const email = existingEmail || window.prompt("Enter the email address for this reminder")?.trim();
    if (!email) {
      return;
    }
    try {
      const result = await sendReminderEmail(Number(row.id), email);
      const payload = result.data as ApiRecord & { sent?: boolean; emailConfigured?: boolean; message?: string };
      window.alert(payload.sent ? "Scheduler email sent and marked completed." : `Scheduler email failed: ${String(payload.message ?? "No email was sent.")}`);
      loadRows();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to send reminder email.");
    }
  }

  function renderEditor(field: FieldDefinition) {
    if (!editing || editing.key !== field.key) {
      return null;
    }
    if (field.relation) {
      return (
        <select
          className="cell-editor"
          autoFocus
          value={editing.value}
          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
          onBlur={commitEdit}
        >
          {!field.required ? <option value="">Not assigned</option> : null}
          {Object.entries(relationMap[field.key] ?? {}).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === "enum") {
      return (
        <select
          className="cell-editor"
          autoFocus
          value={editing.value}
          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
          onBlur={commitEdit}
        >
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
        className="cell-editor"
        autoFocus
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={editing.value}
        onChange={(event) => setEditing({ ...editing, value: event.target.value })}
        onBlur={commitEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitEdit();
          }
          if (event.key === "Escape") {
            setEditing(null);
          }
        }}
      />
    );
  }

  return (
    <section className={`table-panel ${compact ? "table-panel-compact" : ""}`}>
      <div className="table-toolbar">
        <div>
          <h2>{title ?? definition.label}</h2>
          <p>{definition.description}</p>
        </div>
        <div className="toolbar-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
            />
          </div>
          <button className="icon-text-button" onClick={() => setDrawer({ open: true, mode: "add" })}>
            <Plus size={16} />
            Add
          </button>
          <button className="icon-button" onClick={loadRows} title="Refresh" aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="icon-button" onClick={() => downloadCsv(definition, rows, tableFields)} title="Export CSV" aria-label="Export CSV">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="filter-grid">
        {filterFields.map((field) => (
          <FilterControl key={field.key} field={field} value={filters[field.key]} options={filterOptions[field.key]} onChange={(value) => updateFilter(field.key, value)} />
        ))}
      </div>

      {error ? <div className="table-error">{error}</div> : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {tableFields.map((field) => (
                <th key={field.key}>
                  <button className="sort-button" onClick={() => toggleSort(field.key)} title={`Sort by ${field.label}`}>
                    {field.label}
                    {sortBy === field.key ? sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
                  </button>
                </th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.id)}
                className="data-row"
                tabIndex={0}
                onClick={(event) => {
                  if (!isInteractiveTarget(event.target) && !editing) {
                    setDrawer({ open: true, mode: "view", record: row });
                  }
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !editing) {
                    event.preventDefault();
                    setDrawer({ open: true, mode: "view", record: row });
                  }
                }}
              >
                {tableFields.map((field) => {
                  const isEditing = editing?.id === Number(row.id) && editing.key === field.key;
                  return (
                    <td
                      key={field.key}
                      onDoubleClick={() => {
                        if (field.editable !== false && field.form !== false) {
                          setEditing({ id: Number(row.id), key: field.key, value: valueForInput(row[field.key]) });
                        }
                      }}
                    >
                      {isEditing ? (
                        renderEditor(field)
                      ) : field.key === definition.statusField ? (
                        <StatusBadge value={row[field.key]} />
                      ) : (
                        displayCell(field, row[field.key], relationMap)
                      )}
                    </td>
                  );
                })}
                <td className="row-actions">
                  <button className="icon-button" onClick={() => setDrawer({ open: true, mode: "edit", record: row })} title="Edit" aria-label="Edit">
                    <Edit3 size={15} />
                  </button>
                  {definition.key === "reminders" ? (
                    <button className="icon-button" onClick={() => sendReminder(row)} title="Send reminder email" aria-label="Send reminder email">
                      <Mail size={15} />
                    </button>
                  ) : null}
                  <button className="icon-button" onClick={() => archiveRow(row)} title="Archive" aria-label="Archive">
                    <Archive size={15} />
                  </button>
                  {definition.key === "structures" ? (
                    <Link className="icon-button" to={`/structures/${row.id}`} title="Open dashboard" aria-label="Open dashboard">
                      <ExternalLink size={15} />
                    </Link>
                  ) : definition.supportsStructure && row.structure_id ? (
                    <Link className="icon-button" to={`/structures/${row.structure_id}`} title="Related structure" aria-label="Related structure">
                      <ExternalLink size={15} />
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <EmptyState /> : null}
        {loading ? <div className="table-loading">Loading</div> : null}
      </div>

      <div className="pagination-row">
        <span>
          Page {meta.page} of {meta.totalPages} ({meta.total} records)
        </span>
        <div>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button className="text-button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <button className="text-button" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </div>

      <DetailDrawer
        open={drawer.open}
        mode={drawer.mode}
        definition={definition}
        record={drawer.record}
        forcedStructureId={structureId}
        onClose={() => setDrawer({ open: false, mode: "view" })}
        onSubmit={saveDrawer}
      />

    </section>
  );
}
