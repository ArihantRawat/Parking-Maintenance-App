import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, Edit3, ExternalLink, Mail, MoreVertical, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { modulesByKey, type ApiRecord, type FieldDefinition, type ModuleDefinition, type ModuleKey } from "@parking/shared";
import { deleteModuleRecord, createModuleRecord, getModuleRecord, listModule, sendReminderEmail, updateModuleRecord } from "../api/client";
import { recordTitle } from "../utils/format";
import { StatusBadge } from "./StatusBadge";
import { DetailDrawer } from "./DetailDrawer";
import { EmptyState } from "./EmptyState";
import { FilterControl } from "./table/FilterControl";
import type { ActionMenuState, DrawerState, EditingCell, FilterOption, FilterOptions, FilterState, RelationMap, ToastState } from "./table/types";
import {
  ALL_LEVELS_OPTION,
  cleanFilters,
  defaultTableMeta,
  displayCell,
  downloadCsv,
  isInteractiveTarget,
  parseLevels,
  tableStorageKey,
  valueForInput
} from "./table/tableUtils";

type AdvancedTableProps = {
  definition: ModuleDefinition;
  title?: string;
  structureId?: number;
  compact?: boolean;
};

export function AdvancedTable({ definition, title, structureId, compact }: AdvancedTableProps) {
  const scopedStructureId = Number.isFinite(structureId) && Number(structureId) > 0 ? Number(structureId) : undefined;
  const storageKey = tableStorageKey(definition, scopedStructureId);
  const storedState = useMemo(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}") as Partial<{
        search: string;
        filters: FilterState;
        sortBy: string;
        sortDir: "asc" | "desc";
        pageSize: number;
      }>;
      if ((definition.key === "signs" && parsed.sortBy === "installation_date") || (definition.key === "signOrders" && parsed.sortBy === "purchase_date")) {
        return { ...parsed, sortBy: undefined, sortDir: undefined };
      }
      return parsed;
    } catch {
      return {};
    }
  }, [definition.key, storageKey]);
  const initialFilters = useMemo(() => {
    const next = { ...(storedState.filters ?? {}) };
    delete next.structure_id;
    return next;
  }, [storedState.filters]);

  const tableFields = useMemo(
    () => definition.fields.filter((field) => field.table !== false && !(scopedStructureId && field.key === "structure_id")),
    [definition, scopedStructureId]
  );
  const filterFields = useMemo(
    () => definition.fields.filter((field) => field.filter && !(scopedStructureId && field.key === "structure_id")),
    [definition, scopedStructureId]
  );

  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [meta, setMeta] = useState(defaultTableMeta);
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
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);

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
        filters: cleanFilters(filters, new Set(filterFields.map((field) => field.key)), scopedStructureId)
      });
      setRows(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [definition, filterFields, filters, page, pageSize, scopedStructureId, search, sortBy, sortDir]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ search, filters, sortBy, sortDir, pageSize }));
  }, [filters, pageSize, search, sortBy, sortDir, storageKey]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!actionMenu) {
      return;
    }
    function closeMenu() {
      setActionMenu(null);
    }
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [actionMenu]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const optionEntries: Array<[string, FilterOption[]]> = [];
      const relationEntries: Array<[string, Record<string, string>]> = [];
      const optionFields = [...tableFields, ...filterFields].filter((field, index, fields) => fields.findIndex((item) => item.key === field.key) === index);

      for (const field of optionFields) {
        if (field.relation) {
          const related = modulesByKey[field.relation as ModuleKey];
          const relatedFilters = related.supportsStructure && scopedStructureId ? { structure_id: { value: String(scopedStructureId) } } : undefined;
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
          if (scopedStructureId) {
            const structure = await getModuleRecord(modulesByKey.structures, scopedStructureId);
            levelValues = parseLevels(structure.data.levels);
          } else {
            const structures = await listModule(modulesByKey.structures, { pageSize: 100 });
            levelValues = structures.data.flatMap((record) => parseLevels(record.levels));
          }
          if (levelValues.length === 0) {
            const result = await listModule(definition, {
              pageSize: 100,
              filters: scopedStructureId && definition.supportsStructure ? { structure_id: { value: String(scopedStructureId) } } : undefined
            });
            levelValues = result.data.map((record) => String(record[field.key] ?? "")).filter(Boolean);
          }
          const options = Array.from(new Set([ALL_LEVELS_OPTION, ...levelValues]))
            .sort((a, b) => {
              if (a === ALL_LEVELS_OPTION) {
                return -1;
              }
              if (b === ALL_LEVELS_OPTION) {
                return 1;
              }
              return a.localeCompare(b);
            })
            .map((value) => ({ value, label: value }));
          if (options.length > 0) {
            optionEntries.push([field.key, options]);
          }
          continue;
        }

        if (field.key === "space_number") {
          const result = await listModule(definition, {
            pageSize: 100,
            filters: scopedStructureId && definition.supportsStructure ? { structure_id: { value: String(scopedStructureId) } } : undefined
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
  }, [definition, filterFields, scopedStructureId, tableFields]);

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
    if (scopedStructureId && definition.supportsStructure) {
      payload.structure_id = scopedStructureId;
    }
    let saved: ApiRecord;
    if (drawer.mode === "edit" && drawer.record?.id) {
      const result = await updateModuleRecord(definition, Number(drawer.record.id), payload);
      saved = result.data;
    } else {
      const result = await createModuleRecord(definition, payload);
      saved = result.data;
    }
    if (drawer.mode === "add") {
      setRows((current) => [saved, ...current.filter((row) => row.id !== saved.id)].slice(0, pageSize));
      setMeta((current) => ({ ...current, page: 1, total: current.total + 1, totalPages: Math.max(1, Math.ceil((current.total + 1) / current.pageSize)) }));
      if (page !== 1) {
        setPage(1);
      }
    } else {
      await loadRows();
    }
    return saved;
  }

  function handleFormSaved() {
    const wasAdd = drawer.mode === "add";
    setDrawer({ open: false, mode: "view" });
    if (wasAdd) {
      setToast({ id: Date.now(), message: `${definition.singular} created successfully.` });
    }
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

  async function deleteRow(row: ApiRecord) {
    if (!window.confirm(`Delete ${definition.singular} "${recordTitle(row)}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteModuleRecord(definition, Number(row.id));
      setActionMenu(null);
      await loadRows();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Unable to delete ${definition.singular}.`);
    }
  }

  function toggleActionMenu(event: React.MouseEvent<HTMLButtonElement>, row: ApiRecord) {
    event.preventDefault();
    event.stopPropagation();
    const rowId = String(row.id);
    const rect = event.currentTarget.getBoundingClientRect();
    setActionMenu((current) =>
      current?.rowId === rowId
        ? null
        : {
            rowId,
            top: rect.bottom + 6,
            left: Math.min(window.innerWidth - 206, Math.max(12, rect.right - 190))
          }
    );
  }

  async function sendReminder(row: ApiRecord) {
    const existingEmail = String(row.email_to ?? "").trim();
    const email = existingEmail || window.prompt("Enter an email address for this reminder")?.trim();
    if (!email) {
      return;
    }
    try {
      const result = await sendReminderEmail(Number(row.id), email);
      const payload = result.data as ApiRecord & { sent?: boolean; emailConfigured?: boolean; message?: string };
      window.alert(payload.sent ? "Reminder email sent and marked complete." : `Reminder email failed: ${String(payload.message ?? "No email was sent.")}`);
      loadRows();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to send the reminder email.");
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
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
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
              placeholder="Search records"
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
                    setActionMenu(null);
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
                  <button
                    className="row-actions-trigger"
                    onClick={(event) => toggleActionMenu(event, row)}
                    title="Actions"
                    aria-label={`Actions for ${recordTitle(row)}`}
                    aria-expanded={actionMenu?.rowId === String(row.id)}
                  >
                    <MoreVertical size={17} />
                  </button>
                  {actionMenu?.rowId === String(row.id) ? (
                    <div
                      className="row-actions-menu"
                      role="menu"
                      style={{ top: actionMenu.top, left: actionMenu.left }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenu(null);
                          setDrawer({ open: true, mode: "view", record: row });
                        }}
                      >
                        <Search size={14} />
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenu(null);
                          setDrawer({ open: true, mode: "edit", record: row });
                        }}
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      {definition.key === "reminders" ? (
                        <button type="button" onClick={() => sendReminder(row)}>
                          <Mail size={14} />
                          Send reminder email
                        </button>
                      ) : null}
                      {definition.key === "structures" ? (
                        <Link to={`/structures/${row.id}`} onClick={() => setActionMenu(null)}>
                          <ExternalLink size={14} />
                          Open dashboard
                        </Link>
                      ) : null}
                      <button type="button" className="danger" onClick={() => deleteRow(row)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <EmptyState /> : null}
        {loading ? <div className="table-loading">Loading records...</div> : null}
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
        forcedStructureId={scopedStructureId}
        onClose={() => setDrawer({ open: false, mode: "view" })}
        onSubmit={saveDrawer}
        onSaved={handleFormSaved}
      />

      {toast ? (
        <div className="toast-notification" role="status" aria-live="polite" key={toast.id}>
          {toast.message}
        </div>
      ) : null}

    </section>
  );
}
