import { Router } from "express";
import { moduleDefinitions, modulesByRoute, type FieldDefinition, type ModuleDefinition } from "@parking/shared";
import { z } from "zod";
import { db, nowIso, transaction } from "../db/database.js";
import { asyncHandler, HttpError, sendData } from "../utils/api.js";
import { recordActivity, recordAudit } from "../services/audit.js";

type FilterValue = {
  operator?: "contains" | "equals";
  value?: string | number | null;
  min?: string | number | null;
  max?: string | number | null;
  from?: string | null;
  to?: string | null;
};

type ListOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  includeArchived?: boolean;
  filters?: Record<string, FilterValue | string | number | null>;
};

const archiveTables = new Set(
  moduleDefinitions
    .filter((definition) => !["structures", "vendors", "activityEvents"].includes(definition.key))
    .map((definition) => definition.tableName)
);

function allColumns(definition: ModuleDefinition) {
  return new Set(["id", ...definition.fields.map((field) => field.key), "archived_at"]);
}

function writableFields(definition: ModuleDefinition) {
  return definition.fields.filter((field) => field.form !== false && field.key !== "created_at" && field.key !== "updated_at");
}

function fieldByKey(definition: ModuleDefinition, key: string) {
  return definition.fields.find((field) => field.key === key);
}

function normalizeValue(field: FieldDefinition, value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (value === "") {
    return null;
  }
  if (field.type === "number") {
    if (value === null) {
      return null;
    }
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
      throw new HttpError(400, `${field.label} must be a number.`);
    }
    return numberValue;
  }
  if (field.type === "boolean") {
    return value ? 1 : 0;
  }
  return value === null ? null : String(value);
}

function sanitizePayload(definition: ModuleDefinition, body: Record<string, unknown>, partial = false) {
  const output: Record<string, unknown> = {};
  for (const field of writableFields(definition)) {
    if (Object.hasOwn(body, field.key)) {
      output[field.key] = normalizeValue(field, body[field.key]);
    } else if (!partial && field.required) {
      throw new HttpError(400, `${field.label} is required.`);
    }
  }

  if (!partial) {
    for (const field of writableFields(definition)) {
      if (field.required && (output[field.key] === undefined || output[field.key] === null || output[field.key] === "")) {
        throw new HttpError(400, `${field.label} is required.`);
      }
    }
    const structureField = writableFields(definition).find((field) => field.key === "structure_id");
    if (definition.supportsStructure && structureField?.required && !output.structure_id) {
      throw new HttpError(400, "Structure is required.");
    }
  }

  return output;
}

function parseFilters(value: unknown): Record<string, FilterValue | string | number | null> {
  if (!value || typeof value !== "string") {
    return {};
  }
  try {
    return JSON.parse(value) as Record<string, FilterValue | string | number | null>;
  } catch {
    throw new HttpError(400, "filters must be valid JSON.");
  }
}

function addFilter(where: string[], params: unknown[], definition: ModuleDefinition, key: string, raw: FilterValue | string | number | null) {
  const columns = allColumns(definition);
  if (!columns.has(key) || raw === undefined || raw === null || raw === "") {
    return;
  }

  const field = fieldByKey(definition, key);
  const value: FilterValue =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as FilterValue)
      : { value: typeof raw === "string" || typeof raw === "number" ? raw : null };

  if (value.value !== undefined && value.value !== null && value.value !== "") {
    if (field?.filter === "text" || field?.type === "textarea" || value.operator === "contains") {
      where.push(`CAST(${key} AS TEXT) LIKE ?`);
      params.push(`%${value.value}%`);
    } else {
      where.push(`${key} = ?`);
      params.push(value.value);
    }
  }

  if (value.min !== undefined && value.min !== null && value.min !== "") {
    where.push(`${key} >= ?`);
    params.push(value.min);
  }
  if (value.max !== undefined && value.max !== null && value.max !== "") {
    where.push(`${key} <= ?`);
    params.push(value.max);
  }
  if (value.from) {
    where.push(`${key} >= ?`);
    params.push(value.from);
  }
  if (value.to) {
    where.push(`${key} <= ?`);
    params.push(value.to);
  }
}

function buildWhere(definition: ModuleDefinition, options: ListOptions) {
  const where: string[] = [];
  const params: unknown[] = [];
  const columns = allColumns(definition);

  if (archiveTables.has(definition.tableName) && !options.includeArchived) {
    where.push("archived_at IS NULL");
  }

  if (options.search) {
    const searchable = definition.searchFields.filter((field) => columns.has(field));
    if (searchable.length > 0) {
      where.push(`(${searchable.map((field) => `CAST(${field} AS TEXT) LIKE ?`).join(" OR ")})`);
      for (const _field of searchable) {
        params.push(`%${options.search}%`);
      }
    }
  }

  for (const [key, value] of Object.entries(options.filters ?? {})) {
    addFilter(where, params, definition, key, value);
  }

  return {
    clause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

export function listRecords(definition: ModuleDefinition, options: ListOptions) {
  const page = Math.max(1, Number(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize ?? 20)));
  const columns = allColumns(definition);
  const sortBy = columns.has(options.sortBy ?? "") ? options.sortBy : definition.defaultSort;
  const sortDir = options.sortDir === "asc" ? "ASC" : "DESC";
  const where = buildWhere(definition, options);
  const offset = (page - 1) * pageSize;

  const total = (db.prepare(`SELECT COUNT(*) AS count FROM ${definition.tableName} ${where.clause}`).get(...where.params) as { count: number }).count;
  const rows = db
    .prepare(`SELECT * FROM ${definition.tableName} ${where.clause} ORDER BY ${sortBy} ${sortDir}, id DESC LIMIT ? OFFSET ?`)
    .all(...where.params, pageSize, offset);

  return {
    data: rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

export function getRecord(definition: ModuleDefinition, id: number) {
  const row = db.prepare(`SELECT * FROM ${definition.tableName} WHERE id = ?`).get(id);
  if (!row) {
    throw new HttpError(404, `${definition.singular} not found.`);
  }
  return row as Record<string, unknown>;
}

export function createRecord(definition: ModuleDefinition, body: Record<string, unknown>) {
  const payload = sanitizePayload(definition, body);
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new HttpError(400, "No writable fields were provided.");
  }

  const columns = entries.map(([key]) => key);
  const placeholders = columns.map((key) => `@${key}`);

  return transaction(() => {
    const result = db
      .prepare(`INSERT INTO ${definition.tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`)
      .run(Object.fromEntries(entries));
    const id = Number(result.lastInsertRowid);
    const row = getRecord(definition, id);
    recordAudit(definition, id, "created", row);
    recordActivity(definition, id, "created", row);
    return row;
  });
}

export function updateRecord(definition: ModuleDefinition, id: number, body: Record<string, unknown>) {
  const payload = sanitizePayload(definition, body, true);
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new HttpError(400, "No writable fields were provided.");
  }

  entries.push(["updated_at", nowIso()]);
  const assignments = entries.map(([key]) => `${key} = @${key}`);
  const params = { ...Object.fromEntries(entries), id };

  return transaction(() => {
    db.prepare(`UPDATE ${definition.tableName} SET ${assignments.join(", ")} WHERE id = @id`).run(params);
    const row = getRecord(definition, id);
    recordAudit(definition, id, "updated", row);
    recordActivity(definition, id, "updated", row);
    return row;
  });
}

export function deleteRecord(definition: ModuleDefinition, id: number) {
  const existing = getRecord(definition, id);
  return transaction(() => {
    db.prepare(`DELETE FROM ${definition.tableName} WHERE id = ?`).run(id);
    return existing;
  });
}

const bulkSpaceSchema = z.object({
  structure_id: z.coerce.number().int().positive(),
  group_id: z.coerce.number().int().positive().optional().nullable(),
  prefix: z.string().default(""),
  startNumber: z.coerce.number().int().min(0).default(1),
  count: z.coerce.number().int().min(1).max(500),
  padLength: z.coerce.number().int().min(0).max(8).default(3),
  labelPrefix: z.string().default("Space"),
  level: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  type: z.string().default("other"),
  condition: z.string().default("good"),
  status: z.string().default("active"),
  notes: z.string().optional().nullable()
});

export const bulkCreateSpaces = asyncHandler((req, res) => {
  const input = bulkSpaceSchema.parse(req.body);
  const definition = modulesByRoute["parking-spaces"];

  const rows = transaction(() => {
    const created: Record<string, unknown>[] = [];
    for (let index = 0; index < input.count; index += 1) {
      const number = input.startNumber + index;
      const spaceNumber = `${input.prefix}${String(number).padStart(input.padLength, "0")}`;
      created.push(
        createRecord(definition, {
          structure_id: input.structure_id,
          group_id: input.group_id ?? null,
          space_number: spaceNumber,
          label: `${input.labelPrefix} ${spaceNumber}`,
          level: input.level ?? null,
          area: input.area ?? null,
          type: input.type,
          condition: input.condition,
          status: input.status,
          notes: input.notes ?? null
        })
      );
    }
    return created;
  });

  sendData(res.status(201), rows, { count: rows.length });
});

export function createCrudRouter(definition: ModuleDefinition) {
  const router = Router();

  router.get(
    "/",
    asyncHandler((req, res) => {
      const filters = parseFilters(req.query.filters);
      for (const field of definition.fields) {
        const value = req.query[field.key];
        if (value !== undefined && value !== "") {
          filters[field.key] = Array.isArray(value) ? String(value[0]) : String(value);
        }
      }

      const result = listRecords(definition, {
        page: Number(req.query.page ?? 1),
        pageSize: Number(req.query.pageSize ?? 20),
        search: req.query.search ? String(req.query.search) : undefined,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
        sortDir: req.query.sortDir === "asc" ? "asc" : "desc",
        includeArchived: req.query.includeArchived === "true",
        filters
      });
      sendData(res, result.data, result.meta);
    })
  );

  router.get(
    "/:id",
    asyncHandler((req, res) => {
      sendData(res, getRecord(definition, Number(req.params.id)));
    })
  );

  router.post(
    "/",
    asyncHandler((req, res) => {
      sendData(res.status(201), createRecord(definition, req.body));
    })
  );

  router.patch(
    "/:id",
    asyncHandler((req, res) => {
      sendData(res, updateRecord(definition, Number(req.params.id), req.body));
    })
  );

  router.put(
    "/:id",
    asyncHandler((req, res) => {
      sendData(res, updateRecord(definition, Number(req.params.id), req.body));
    })
  );

  router.delete(
    "/:id",
    asyncHandler((req, res) => {
      sendData(res, deleteRecord(definition, Number(req.params.id)));
    })
  );

  return router;
}
