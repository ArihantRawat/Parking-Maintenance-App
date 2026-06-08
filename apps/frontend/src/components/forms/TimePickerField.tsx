type TimePickerFieldProps = {
  value: unknown;
  onChange: (value: string) => void;
};

function valueForTimeInput(value: unknown) {
  const text = String(value ?? "").trim();
  const twelveHour = text.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!twelveHour) {
    return text;
  }
  let hours = Number(twelveHour[1]);
  const minutes = twelveHour[2];
  const meridiem = twelveHour[3].toUpperCase();
  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }
  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export function TimePickerField({ value, onChange }: TimePickerFieldProps) {
  return (
    <input type="time" value={valueForTimeInput(value)} onChange={(event) => onChange(event.target.value)} />
  );
}
