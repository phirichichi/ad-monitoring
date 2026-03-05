import { useMemo, useState } from "react";

type ReportFormat = "pdf" | "xlsx" | "csv";

type ReportRequest = {
  format: ReportFormat;
  from_ts: string;
  to_ts: string;
  channel_id: string | null;
  advertiser_id: string | null;
  status: string | null;
  include_unscheduled: boolean;
  include_missed: boolean;
};

export default function ReportsPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [fromTs, setFromTs] = useState("");
  const [toTs, setToTs] = useState("");
  const [includeUnscheduled, setIncludeUnscheduled] = useState(true);
  const [includeMissed, setIncludeMissed] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canRun = useMemo(() => Boolean(fromTs) && Boolean(toTs), [fromTs, toTs]);

  async function downloadReport() {
    if (!canRun) return;
    setLoading(true);
    setErr(null);

    const access = localStorage.getItem("access_token") || "";

    const payload: ReportRequest = {
      format,
      from_ts: new Date(fromTs).toISOString(),
      to_ts: new Date(toTs).toISOString(),
      channel_id: null,
      advertiser_id: null,
      status: null,
      include_unscheduled: includeUnscheduled,
      include_missed: includeMissed,
    };

    try {
      const res = await fetch(`${apiBase}/api/v1/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const filename = `compliance_report.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Reports</h2>
          <p style={styles.sub}>Generate compliance reports (PDF/XLSX/CSV).</p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)} style={styles.select}>
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
              <option value="csv">CSV</option>
            </select>
          </label>

          <label style={styles.label}>
            From (local time)
            <input value={fromTs} onChange={(e) => setFromTs(e.target.value)} type="datetime-local" style={styles.input} />
          </label>

          <label style={styles.label}>
            To (local time)
            <input value={toTs} onChange={(e) => setToTs(e.target.value)} type="datetime-local" style={styles.input} />
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button style={styles.primaryBtn} disabled={loading || !canRun} onClick={() => void downloadReport()}>
              {loading ? "Generating..." : "Generate & Download"}
            </button>
          </div>
        </div>

        <div style={styles.checkRow}>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={includeUnscheduled}
              onChange={(e) => setIncludeUnscheduled(e.target.checked)}
            />
            Include unscheduled
          </label>

          <label style={styles.checkLabel}>
            <input type="checkbox" checked={includeMissed} onChange={(e) => setIncludeMissed(e.target.checked)} />
            Include missed
          </label>
        </div>

        {err && <div style={styles.errorBox}>{err}</div>}

        <div style={styles.hint}>
          Expected backend endpoint: <code>POST /api/v1/reports/generate</code> (returns file bytes).
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 18 },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  h2: { margin: 0, color: "#0d47a1" },
  sub: { margin: "6px 0 0 0", color: "#555", fontSize: 13 },
  card: { background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7", boxShadow: "0 8px 20px rgba(0,0,0,0.06)" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 12 },
  label: { fontSize: 12, color: "#444", display: "grid", gap: 6 },
  input: { padding: 10, borderRadius: 10, border: "1px solid #d0d7e2", outline: "none" },
  select: { padding: 10, borderRadius: 10, border: "1px solid #d0d7e2", background: "#fff", outline: "none" },
  primaryBtn: { background: "#1976d2", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer", width: "100%" },
  checkRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 },
  checkLabel: { display: "flex", alignItems: "center", gap: 8, color: "#333", fontSize: 13 },
  errorBox: { background: "#ffe6e6", border: "1px solid #ffb3b3", padding: 10, borderRadius: 10, marginBottom: 12, color: "#7a0000", fontSize: 13 },
  hint: { marginTop: 8, fontSize: 12, color: "#666" },
};