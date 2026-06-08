export function formatDate(value: unknown) {
  if (!value) {
    return "";
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  return date.toLocaleDateString();
}

export function formatDateTime(value: unknown) {
  if (!value) {
    return "";
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

export function formatTime(value: unknown) {
  if (!value) {
    return "";
  }
  const text = String(value).trim();
  const twelveHour = text.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (twelveHour) {
    return `${Number(twelveHour[1])}:${twelveHour[2]} ${twelveHour[3].toUpperCase()}`;
  }
  const twentyFourHour = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHour) {
    return text;
  }
  const hours = Number(twentyFourHour[1]);
  const minutes = twentyFourHour[2];
  const meridiem = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${meridiem}`;
}

export function formatCurrency(value: unknown) {
  const numberValue = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numberValue);
}

export function humanize(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

export function recordTitle(record: Record<string, unknown>) {
  return String(
    record.name ??
      record.title ??
      record.label ??
      record.space_number ??
      record.sign_type ??
      record.issue_type ??
      record.cleaning_type ??
      record.stripping_type ??
      record.inspection_type ??
      record.item_type ??
      record.file_name ??
      "Untitled"
  );
}
