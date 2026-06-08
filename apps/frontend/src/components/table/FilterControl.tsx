import type { FieldDefinition } from "@parking/shared";
import type { FilterOption, FilterState } from "./types";

type FilterControlProps = {
  field: FieldDefinition;
  value: FilterState[string] | undefined;
  onChange: (value: FilterState[string]) => void;
  options?: FilterOption[];
};

export function FilterControl({ field, value, onChange, options }: FilterControlProps) {
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
