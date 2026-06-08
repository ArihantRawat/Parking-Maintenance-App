import type { ApiListResponse, ApiRecord, ApiSingleResponse, ModuleDefinition } from "@parking/shared";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | Record<string, unknown>>;

function buildUrl(path: string, params?: QueryParams) {
  const url = new URL(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, options?: RequestInit, params?: QueryParams): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    headers: options?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export type ListOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, unknown>;
};

export async function listModule(definition: ModuleDefinition, options: ListOptions = {}) {
  return request<ApiListResponse<ApiRecord>>(`/${definition.route}`, undefined, options as QueryParams);
}

export async function getModuleRecord(definition: ModuleDefinition, id: number) {
  return request<ApiSingleResponse<ApiRecord>>(`/${definition.route}/${id}`);
}

export async function createModuleRecord(definition: ModuleDefinition, payload: ApiRecord) {
  return request<ApiSingleResponse<ApiRecord>>(`/${definition.route}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateModuleRecord(definition: ModuleDefinition, id: number, payload: ApiRecord) {
  return request<ApiSingleResponse<ApiRecord>>(`/${definition.route}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteModuleRecord(definition: ModuleDefinition, id: number) {
  return request<ApiSingleResponse<ApiRecord>>(`/${definition.route}/${id}`, {
    method: "DELETE"
  });
}

export async function bulkCreateSpaces(payload: ApiRecord) {
  return request<ApiSingleResponse<ApiRecord[]>>("/parking-spaces/bulk", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function globalSearch(q: string) {
  return request<ApiSingleResponse<Array<{ moduleKey: string; route: string; label: string; records: ApiRecord[] }>>>("/search", undefined, { q });
}

export async function fetchTimeline(params: QueryParams = {}) {
  return request<ApiListResponse<ApiRecord>>("/timeline", undefined, params);
}

export async function fetchRelationshipGraph(structureId: number, params: QueryParams = {}) {
  return request<ApiSingleResponse<{ nodes: ApiRecord[]; edges: ApiRecord[] }>>(`/relationships/${structureId}`, undefined, params);
}

export async function fetchReport(type: string, params: QueryParams = {}) {
  return request<ApiListResponse<ApiRecord>>(`/reports/${type}`, undefined, params);
}

export function reportDownloadUrl(type: string, format: "xlsx" | "pdf", params: QueryParams = {}) {
  return buildUrl(`/reports/${type}`, { ...params, format });
}

export async function generateReminders() {
  return request<ApiSingleResponse<ApiRecord[]>>("/reminders/generate", { method: "POST" });
}

export async function sendReminderEmail(id: number, to?: string) {
  return request<ApiSingleResponse<ApiRecord>>(`/reminders/${id}/send`, {
    method: "POST",
    body: JSON.stringify({ to })
  });
}

export async function generateTicketFromInspection(id: number, payload: ApiRecord = {}) {
  return request<ApiSingleResponse<ApiRecord>>(`/inspections/${id}/generate-ticket`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function uploadAttachment(formData: FormData) {
  return request<ApiSingleResponse<ApiRecord[]>>("/attachments/upload", {
    method: "POST",
    body: formData
  });
}
