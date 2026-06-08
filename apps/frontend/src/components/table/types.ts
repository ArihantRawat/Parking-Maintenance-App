import type { ApiRecord } from "@parking/shared";

export type FilterState = Record<string, { value?: string; min?: string; max?: string; from?: string; to?: string }>;
export type FilterOption = { value: string; label: string };
export type FilterOptions = Record<string, FilterOption[]>;
export type RelationMap = Record<string, Record<string, string>>;

export type DrawerState = {
  open: boolean;
  mode: "view" | "edit" | "add";
  record?: ApiRecord | null;
};

export type EditingCell = {
  id: number;
  key: string;
  value: string;
};

export type ToastState = {
  id: number;
  message: string;
};

export type ActionMenuState = {
  rowId: string;
  top: number;
  left: number;
};
