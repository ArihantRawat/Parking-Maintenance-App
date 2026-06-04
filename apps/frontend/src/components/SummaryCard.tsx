type SummaryCardProps = {
  label: string;
  value: string | number;
  detail?: string;
};

export function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      {detail ? <div className="summary-detail">{detail}</div> : null}
    </div>
  );
}
