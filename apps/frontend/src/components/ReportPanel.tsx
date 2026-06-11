import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { ApiRecord } from "@parking/shared";
import { fetchReport, reportDownloadUrl } from "../api/client";
import { formatCurrency, humanize } from "../utils/format";
import { EmptyState } from "./EmptyState";

function isIdColumn(column: string) {
  return column === "id" || column.endsWith("_id");
}

function formatReportCell(column: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (column.includes("cost")) {
    return formatCurrency(value);
  }
  const preserveRaw = /name|title|label|location|email|notes|description|number|url|path|file|address|phone|actor|vendor|date|_at$/i;
  if (preserveRaw.test(column)) {
    return String(value);
  }
  return humanize(String(value));
}

const reportTypes = [
  { key: "maintenance", label: "Maintenance" },
  { key: "cleaning", label: "Cleaning" },
  { key: "stripping", label: "Stripping" },
  { key: "sign", label: "Signs" },
  { key: "equipment", label: "Equipment" },
  { key: "purchase", label: "Purchases" },
  { key: "structure-summary", label: "Structure Summary" },
  { key: "overdue-task", label: "Overdue Tasks" },
  { key: "cost-summary", label: "Cost Summary" }
];

export function ReportPanel({ structureId }: { structureId?: number }) {
  const [reportType, setReportType] = useState("maintenance");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const params = { structure_id: structureId, status, type, category, from, to };

  useEffect(() => {
    fetchReport(reportType, params)
      .then((result) => setRows(result.data))
      .catch(() => setRows([]));
  }, [category, from, reportType, status, structureId, to, type]);

  const columns = rows[0] ? Object.keys(rows[0]).filter((column) => !isIdColumn(column)).slice(0, 8) : [];

  return (
    <section className="report-panel">
      <div className="section-header">
        <div>
          <h2>Reports</h2>
          <p>Download filtered Excel or PDF reports from the current results</p>
        </div>
        <div className="toolbar-actions">
          <a className="icon-text-button" href={reportDownloadUrl(reportType, "xlsx", params)}>
            <FileSpreadsheet size={16} />
            Excel
          </a>
          <a className="icon-text-button" href={reportDownloadUrl(reportType, "pdf", params)}>
            <FileText size={16} />
            PDF
          </a>
        </div>
      </div>
      <div className="report-filters">
        <label>
          <span>Report</span>
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            {reportTypes.map((report) => (
              <option key={report.key} value={report.key}>
                {report.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <input value={status} onChange={(event) => setStatus(event.target.value)} />
        </label>
        <label>
          <span>Type</span>
          <input value={type} onChange={(event) => setType(event.target.value)} />
        </label>
        <label>
          <span>Category</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label>
          <span>From</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      <div className="table-scroll report-preview">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{humanize(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 25).map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{formatReportCell(column, row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <EmptyState title="No report data found" /> : null}
      </div>
      <div className="pagination-row">
        <span>{rows.length} rows</span>
        <a className="text-button" href={reportDownloadUrl(reportType, "xlsx", params)}>
          <Download size={14} />
          Export current results
        </a>
      </div>
    </section>
  );
}
