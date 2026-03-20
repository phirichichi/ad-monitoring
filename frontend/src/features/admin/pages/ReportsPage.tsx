import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type {
  Advertiser,
  Channel,
  PlaybackLog,
  PlaybackReportExportFormat,
  PlaybackStatus,
} from "../../../api/types";

type ReportFormat = PlaybackReportExportFormat;

const STATUS_OPTIONS: Array<{ value: "" | PlaybackStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "matched", label: "Matched" },
  { value: "partial", label: "Partial" },
  { value: "missed", label: "Missed" },
  { value: "unscheduled", label: "Unscheduled" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

/**
 * Safely formats a date/time string for preview tables.
 */
function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

/**
 * Formats a duration value in seconds.
 */
function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${seconds}s`;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Creates a better export filename.
 */
function buildFilename(format: ReportFormat, fromTs: string, toTs: string): string {
  const fromPart = fromTs ? fromTs.slice(0, 10) : "from";
  const toPart = toTs ? toTs.slice(0, 10) : "to";
  return `playback_report_${fromPart}_${toPart}.${format}`;
}

export default function ReportsPage() {
  const [format, setFormat] = useState<ReportFormat>("csv");

  const [fromTs, setFromTs] = useState("");
  const [toTs, setToTs] = useState("");

  const [advertiserName, setAdvertiserName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [status, setStatus] = useState<"" | PlaybackStatus>("");

  const [minDurationSeconds, setMinDurationSeconds] = useState("");
  const [maxDurationSeconds, setMaxDurationSeconds] = useState("");

  const [rows, setRows] = useState<PlaybackLog[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Loads filters data such as channels and advertiser names.
   */
  useEffect(() => {
    async function bootstrap() {
      setBootstrapLoading(true);
      setErr(null);

      try {
        const [channelData, advertiserData] = await Promise.all([
          AdminApi.listChannels(),
          AdminApi.listAdvertisers(),
        ]);

        setChannels(channelData);
        setAdvertisers(advertiserData);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load report filter data");
      } finally {
        setBootstrapLoading(false);
      }
    }

    void bootstrap();
  }, []);

  const timeRangeError = useMemo(() => {
    if (!fromTs || !toTs) return "Select both From and To date/time.";
    if (new Date(fromTs).getTime() >= new Date(toTs).getTime()) {
      return "The From date/time must be earlier than the To date/time.";
    }

    return null;
  }, [fromTs, toTs]);

  const durationError = useMemo(() => {
    if (!minDurationSeconds || !maxDurationSeconds) return null;

    const min = Number(minDurationSeconds);
    const max = Number(maxDurationSeconds);

    if (Number.isNaN(min) || Number.isNaN(max)) return "Duration filters must be valid numbers.";
    if (min > max) return "Minimum duration cannot be greater than maximum duration.";

    return null;
  }, [minDurationSeconds, maxDurationSeconds]);

  const canRunPreview = useMemo(() => {
    return !timeRangeError && !durationError && !previewLoading;
  }, [timeRangeError, durationError, previewLoading]);

  const canExport = useMemo(() => {
    return rows.length > 0 && !timeRangeError && !durationError && !exportLoading;
  }, [rows.length, timeRangeError, durationError, exportLoading]);

  const summary = useMemo(() => {
    const advertiserSet = new Set(rows.map((row) => row.advertiser_name).filter(Boolean));
    const videoSet = new Set(rows.map((row) => row.video_name).filter(Boolean));
    const channelSet = new Set(rows.map((row) => row.channel_name).filter(Boolean));

    return {
      totalRows: rows.length,
      uniqueAdvertisers: advertiserSet.size,
      uniqueVideos: videoSet.size,
      uniqueChannels: channelSet.size,
      evidenceCount: rows.filter((row) => row.evidence_available || row.screenshot_url || row.screenshot_path).length,
      totalDurationSeconds: rows.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0),
    };
  }, [rows]);

  /**
   * Loads playback log preview rows before export.
   */
  async function previewReport() {
    if (!canRunPreview || timeRangeError || durationError) return;

    setPreviewLoading(true);
    setErr(null);
    setSuccess(null);

    try {
      const result = await AdminApi.listPlaybackLogs({
        from_ts: new Date(fromTs).toISOString(),
        to_ts: new Date(toTs).toISOString(),
        advertiser_name: advertiserName.trim() || null,
        channel_id: channelId || null,
        status: status || null,
        min_duration_seconds: minDurationSeconds ? Number(minDurationSeconds) : null,
        max_duration_seconds: maxDurationSeconds ? Number(maxDurationSeconds) : null,
      });

      setRows(result);
      setSuccess(`Loaded ${result.length} playback record(s) for preview.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load playback preview");
      setRows([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  /**
   * Downloads an exported playback report based on current filters.
   */
  async function downloadReport() {
    if (!canExport || timeRangeError || durationError) return;

    setExportLoading(true);
    setErr(null);
    setSuccess(null);

    try {
      const blob = await AdminApi.exportPlaybackReport({
        format,
        from_ts: new Date(fromTs).toISOString(),
        to_ts: new Date(toTs).toISOString(),
        advertiser_name: advertiserName.trim() || null,
        channel_id: channelId || null,
        status: status || null,
        min_duration_seconds: minDurationSeconds ? Number(minDurationSeconds) : null,
        max_duration_seconds: maxDurationSeconds ? Number(maxDurationSeconds) : null,
      });

      const filename = buildFilename(format, fromTs, toTs);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccess(`Playback report exported successfully as ${filename}.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to export playback report");
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Reports</h2>
          <p style={styles.sub}>
            Preview and export playback reports built from actual ad detections,
            timestamps, and screenshot evidence.
          </p>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Filters</h3>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Format
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ReportFormat)}
              style={styles.select}
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
              <option value="csv">CSV</option>
            </select>
          </label>

          <label style={styles.label}>
            From (local time)
            <input
              value={fromTs}
              onChange={(e) => setFromTs(e.target.value)}
              type="datetime-local"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            To (local time)
            <input
              value={toTs}
              onChange={(e) => setToTs(e.target.value)}
              type="datetime-local"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Advertiser Name
            <input
              value={advertiserName}
              onChange={(e) => setAdvertiserName(e.target.value)}
              list="advertiser-name-options"
              placeholder="Search advertiser"
              style={styles.input}
            />
            <datalist id="advertiser-name-options">
              {advertisers.map((item) => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
          </label>

          <label style={styles.label}>
            Channel
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              style={styles.select}
              disabled={bootstrapLoading}
            >
              <option value="">All channels</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | PlaybackStatus)}
              style={styles.select}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Min Duration (seconds)
            <input
              value={minDurationSeconds}
              onChange={(e) => setMinDurationSeconds(e.target.value)}
              type="number"
              min={0}
              placeholder="0"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Max Duration (seconds)
            <input
              value={maxDurationSeconds}
              onChange={(e) => setMaxDurationSeconds(e.target.value)}
              type="number"
              min={0}
              placeholder="120"
              style={styles.input}
            />
          </label>
        </div>

        {(timeRangeError || durationError) && (
          <div style={styles.errorBox}>{timeRangeError || durationError}</div>
        )}

        {err && <div style={styles.errorBox}>{err}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <div style={styles.buttonRow}>
          <button
            style={{ ...styles.secondaryBtn, opacity: canRunPreview ? 1 : 0.65 }}
            disabled={!canRunPreview}
            onClick={() => void previewReport()}
          >
            {previewLoading ? "Loading Preview..." : "Preview Report"}
          </button>

          <button
            style={{ ...styles.primaryBtn, opacity: canExport ? 1 : 0.65 }}
            disabled={!canExport}
            onClick={() => void downloadReport()}
          >
            {exportLoading ? "Exporting..." : "Export Report"}
          </button>
        </div>

        <div style={styles.hint}>
          Reports are now based on playback logs: actual detected ad plays with timestamps,
          status, duration, and screenshot evidence captured shortly after detection.
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary.totalRows}</div>
          <div style={styles.summaryLabel}>Rows</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary.uniqueAdvertisers}</div>
          <div style={styles.summaryLabel}>Advertisers</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary.uniqueVideos}</div>
          <div style={styles.summaryLabel}>Videos</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary.uniqueChannels}</div>
          <div style={styles.summaryLabel}>Channels</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{summary.evidenceCount}</div>
          <div style={styles.summaryLabel}>Evidence Count</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{formatDuration(summary.totalDurationSeconds)}</div>
          <div style={styles.summaryLabel}>Total Duration</div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Playback Preview</h3>

        {rows.length === 0 ? (
          <div style={styles.emptyState}>
            No playback records loaded yet. Choose a time range and preview the report first.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Advertiser</th>
                  <th style={styles.th}>Video Name</th>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Played At</th>
                  <th style={styles.th}>Played Date</th>
                  <th style={styles.th}>Played Time</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Confidence</th>
                  <th style={styles.th}>Evidence</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={styles.tr}>
                    <td style={styles.td}>{row.advertiser_name}</td>
                    <td style={styles.td}>{row.video_name}</td>
                    <td style={styles.td}>{row.channel_name}</td>
                    <td style={styles.tdMono}>{formatDateTime(row.played_at)}</td>
                    <td style={styles.td}>{row.played_date || "-"}</td>
                    <td style={styles.td}>{row.played_time || "-"}</td>
                    <td style={styles.td}>{formatDuration(row.duration_seconds)}</td>
                    <td style={styles.td}>{row.status}</td>
                    <td style={styles.td}>
                      {row.confidence !== null && row.confidence !== undefined
                        ? `${row.confidence.toFixed(1)}%`
                        : "-"}
                    </td>
                    <td style={styles.td}>
                      {row.screenshot_url ? (
                        <a
                          href={row.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.link}
                        >
                          View Screenshot
                        </a>
                      ) : row.screenshot_path ? (
                        <span style={styles.muted}>Stored</span>
                      ) : (
                        <span style={styles.muted}>None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.hint}>
          Each row represents a real playback record: ad detected, timestamped,
          and optionally linked to screenshot evidence captured after detection.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 18,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  h2: {
    margin: 0,
    color: "#0d47a1",
  },
  sub: {
    margin: "6px 0 0 0",
    color: "#555",
    fontSize: 13,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    marginBottom: 16,
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    color: "#0d47a1",
    fontSize: 16,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#444",
    display: "grid",
    gap: 6,
  },
  input: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d0d7e2",
    outline: "none",
  },
  select: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d0d7e2",
    background: "#fff",
    outline: "none",
  },
  buttonRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 10,
  },
  primaryBtn: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#eaf2ff",
    color: "#0d47a1",
    border: "1px solid #cfe1ff",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #eef2f7",
    boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
    padding: 14,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0d47a1",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: 10,
    fontSize: 13,
    color: "#333",
    borderBottom: "1px solid #eef2f7",
  },
  tr: {
    borderTop: "1px solid #f0f2f5",
  },
  td: {
    padding: 10,
    fontSize: 13,
    color: "#111",
    verticalAlign: "top",
  },
  tdMono: {
    padding: 10,
    fontSize: 12,
    color: "#111",
    fontFamily: "monospace",
    verticalAlign: "top",
  },
  link: {
    color: "#0d47a1",
    fontWeight: 700,
    textDecoration: "none",
  },
  muted: {
    color: "#666",
    fontSize: 12,
  },
  emptyState: {
    padding: 14,
    borderRadius: 10,
    background: "#fbfcff",
    border: "1px solid #eef2f7",
    color: "#666",
    fontSize: 13,
  },
  errorBox: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    color: "#7a0000",
    fontSize: 13,
  },
  successBox: {
    background: "#e8f5e9",
    border: "1px solid #c8e6c9",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    color: "#1b5e20",
    fontSize: 13,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: "#666",
  },
};