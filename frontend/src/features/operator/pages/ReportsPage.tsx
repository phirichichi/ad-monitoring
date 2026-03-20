import { useEffect, useMemo, useState } from "react";
import OperatorCard from "../components/OperatorCard";
import OperatorSectionHeader from "../components/OperatorSectionHeader";
import ErrorMessage from "../components/ErrorMessage";
import "../../../styles/operator/ReportsPage.css";

type ReportFormat = "pdf" | "xlsx" | "csv";
type PlaybackStatus = "matched" | "partial" | "missed" | "unscheduled" | "";

type FilterOption = {
  id: string;
  label: string;
};

/**
 * Playback log row used by the operator report preview table.
 * This reflects the real operational reporting source:
 * detected playbacks with timestamps and screenshot evidence.
 */
type PlaybackReportRow = {
  id: string;
  advertiser_name: string;
  video_name: string;
  channel_name: string;
  played_at: string;
  played_date: string;
  played_time: string;
  duration_seconds: number | null;
  status: string;
  confidence: number | null;
  screenshot_path?: string | null;
};

/**
 * Aggregate summary returned by preview endpoint.
 */
type PlaybackReportSummary = {
  total_rows: number;
  unique_advertisers: number;
  unique_videos: number;
  unique_channels: number;
  screenshot_count: number;
};

/**
 * Preview response from backend.
 */
type PlaybackReportPreviewResponse = {
  rows: PlaybackReportRow[];
  summary: PlaybackReportSummary;
};

/**
 * Export/generation payload.
 * This is now aligned to playback-log based reporting.
 */
type ReportRequest = {
  format: ReportFormat;
  from_ts: string;
  to_ts: string;
  channel_id: string | null;
  advertiser_name: string | null;
  status: string | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
  include_unscheduled: boolean;
  include_missed: boolean;
};

type ReportHistoryItem = {
  id: string;
  filename: string;
  created_at: string;
  format: ReportFormat;
  from_ts: string;
  to_ts: string;
  channel_id: string | null;
  advertiser_name: string | null;
  status: string | null;
};

const CHANNEL_OPTIONS: FilterOption[] = [
  { id: "channel-1", label: "ZNBC 1" },
  { id: "channel-2", label: "Muvi TV" },
  { id: "channel-3", label: "Prime TV" },
];

/**
 * Converts datetime-local input into ISO string.
 */
function toIsoOrNull(value: string): string | null {
  if (!value.trim()) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

/**
 * Formats ISO timestamps into readable local date/time.
 */
function formatDateTime(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

/**
 * Formats duration values for display.
 */
function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "-";

  if (seconds < 60) return `${seconds}s`;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Formats confidence safely.
 */
function formatConfidence(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

/**
 * Creates a filename-safe date portion.
 */
function toFilenameDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace(/[:T]/g, "-").slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Builds a descriptive export filename.
 */
function buildReportFilename(
  format: ReportFormat,
  fromIso: string,
  toIso: string,
): string {
  const fromDate = toFilenameDate(fromIso);
  const toDate = toFilenameDate(toIso);
  return `operator_playback_report_${fromDate}_${toDate}.${format}`;
}

/**
 * Resolves the API base URL.
 */
function getApiBaseUrl(): string {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");
  return window.location.origin;
}

/**
 * Browser blob download helper.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const apiBase = getApiBaseUrl();

  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [fromTs, setFromTs] = useState("");
  const [toTs, setToTs] = useState("");
  const [channelId, setChannelId] = useState("");
  const [advertiserName, setAdvertiserName] = useState("");
  const [status, setStatus] = useState<PlaybackStatus>("");
  const [minDurationSeconds, setMinDurationSeconds] = useState("");
  const [maxDurationSeconds, setMaxDurationSeconds] = useState("");

  const [includeUnscheduled, setIncludeUnscheduled] = useState(true);
  const [includeMissed, setIncludeMissed] = useState(true);

  const [previewRows, setPreviewRows] = useState<PlaybackReportRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<PlaybackReportSummary | null>(null);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<ReportHistoryItem[]>([]);

  const fromIso = useMemo(() => toIsoOrNull(fromTs), [fromTs]);
  const toIso = useMemo(() => toIsoOrNull(toTs), [toTs]);

  const rangeError = useMemo(() => {
    if (!fromTs || !toTs) return null;
    if (!fromIso || !toIso) return "From and To must be valid date/time values.";
    if (new Date(fromIso).getTime() >= new Date(toIso).getTime()) {
      return "The 'To' date/time must be later than the 'From' date/time.";
    }
    return null;
  }, [fromTs, toTs, fromIso, toIso]);

  const durationError = useMemo(() => {
    if (!minDurationSeconds && !maxDurationSeconds) return null;

    const min = minDurationSeconds ? Number(minDurationSeconds) : null;
    const max = maxDurationSeconds ? Number(maxDurationSeconds) : null;

    if (min != null && (!Number.isFinite(min) || min < 0)) {
      return "Minimum duration must be 0 or greater.";
    }

    if (max != null && (!Number.isFinite(max) || max < 0)) {
      return "Maximum duration must be 0 or greater.";
    }

    if (min != null && max != null && min > max) {
      return "Minimum duration cannot be greater than maximum duration.";
    }

    return null;
  }, [minDurationSeconds, maxDurationSeconds]);

  const previewPayload = useMemo<ReportRequest | null>(() => {
    if (!fromIso || !toIso || rangeError || durationError) return null;

    return {
      format,
      from_ts: fromIso,
      to_ts: toIso,
      channel_id: channelId || null,
      advertiser_name: advertiserName.trim() || null,
      status: status || null,
      min_duration_seconds: minDurationSeconds ? Number(minDurationSeconds) : null,
      max_duration_seconds: maxDurationSeconds ? Number(maxDurationSeconds) : null,
      include_unscheduled: includeUnscheduled,
      include_missed: includeMissed,
    };
  }, [
    format,
    fromIso,
    toIso,
    channelId,
    advertiserName,
    status,
    minDurationSeconds,
    maxDurationSeconds,
    includeUnscheduled,
    includeMissed,
    rangeError,
    durationError,
  ]);

  const canPreview = useMemo(() => {
    return !!previewPayload && !loadingPreview;
  }, [previewPayload, loadingPreview]);

  const canExport = useMemo(() => {
    return !!previewPayload && !loadingExport && !loadingPreview;
  }, [previewPayload, loadingExport, loadingPreview]);

  /**
   * Loads preview rows from playback-log reporting endpoint.
   * If backend preview is not ready yet, a clear error is shown.
   */
  async function loadPreview() {
    if (!previewPayload) return;

    setLoadingPreview(true);
    setErr(null);
    setSuccess(null);

    const access = localStorage.getItem("access_token") || "";

    try {
      const res = await fetch(`${apiBase}/api/v1/reports/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify(previewPayload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Preview request failed (${res.status})`);
      }

      const data = (await res.json()) as PlaybackReportPreviewResponse;

      setPreviewRows(Array.isArray(data.rows) ? data.rows : []);
      setPreviewSummary(data.summary ?? null);
      setSuccess("Playback report preview loaded successfully.");
    } catch (e) {
      setPreviewRows([]);
      setPreviewSummary(null);
      setErr(e instanceof Error ? e.message : "Failed to load report preview");
    } finally {
      setLoadingPreview(false);
    }
  }

  /**
   * Exports the filtered playback report.
   */
  async function downloadReport() {
    if (!previewPayload || !fromIso || !toIso) return;

    setLoadingExport(true);
    setErr(null);
    setSuccess(null);

    const access = localStorage.getItem("access_token") || "";

    try {
      const res = await fetch(`${apiBase}/api/v1/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify(previewPayload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export request failed (${res.status})`);
      }

      const blob = await res.blob();
      const filename = buildReportFilename(format, fromIso, toIso);

      downloadBlob(blob, filename);

      const historyItem: ReportHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename,
        created_at: new Date().toISOString(),
        format,
        from_ts: fromIso,
        to_ts: toIso,
        channel_id: channelId || null,
        advertiser_name: advertiserName.trim() || null,
        status: status || null,
      };

      setHistory((prev) => [historyItem, ...prev].slice(0, 10));
      setSuccess(`Report exported successfully: ${filename}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to export report");
    } finally {
      setLoadingExport(false);
    }
  }

  useEffect(() => {
    setPreviewRows([]);
    setPreviewSummary(null);
  }, [
    format,
    fromTs,
    toTs,
    channelId,
    advertiserName,
    status,
    minDurationSeconds,
    maxDurationSeconds,
    includeUnscheduled,
    includeMissed,
  ]);

  return (
    <div className="operator-reports-page">
      <OperatorSectionHeader
        title="Reports"
        subtitle="Preview playback records from detected ad events, then export PDF, XLSX, or CSV reports."
      />

      {(err || success) && (
        <div className="operator-reports-message-wrap">
          {err ? <ErrorMessage message={err} /> : null}
          {success ? <div className="operator-reports-success-box">{success}</div> : null}
        </div>
      )}

      <OperatorCard
        title="Playback Report Filters"
        subtitle="Filter by reporting period, advertiser, channel, status, and duration before previewing rows."
      >
        <div className="operator-reports-form-grid">
          <label className="operator-reports-label">
            Format
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ReportFormat)}
              className="operator-reports-select"
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
              <option value="csv">CSV</option>
            </select>
          </label>

          <label className="operator-reports-label">
            From
            <input
              value={fromTs}
              onChange={(e) => setFromTs(e.target.value)}
              type="datetime-local"
              className="operator-reports-input"
            />
          </label>

          <label className="operator-reports-label">
            To
            <input
              value={toTs}
              onChange={(e) => setToTs(e.target.value)}
              type="datetime-local"
              className="operator-reports-input"
            />
          </label>

          <label className="operator-reports-label">
            Channel
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="operator-reports-select"
            >
              <option value="">All channels</option>
              {CHANNEL_OPTIONS.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.label}
                </option>
              ))}
            </select>
          </label>

          <label className="operator-reports-label">
            Advertiser Name
            <input
              value={advertiserName}
              onChange={(e) => setAdvertiserName(e.target.value)}
              type="text"
              placeholder="e.g. Airtel"
              className="operator-reports-input"
            />
          </label>

          <label className="operator-reports-label">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PlaybackStatus)}
              className="operator-reports-select"
            >
              <option value="">All statuses</option>
              <option value="matched">matched</option>
              <option value="partial">partial</option>
              <option value="missed">missed</option>
              <option value="unscheduled">unscheduled</option>
            </select>
          </label>

          <label className="operator-reports-label">
            Min Duration (seconds)
            <input
              value={minDurationSeconds}
              onChange={(e) => setMinDurationSeconds(e.target.value)}
              type="number"
              min="0"
              placeholder="0"
              className="operator-reports-input"
            />
          </label>

          <label className="operator-reports-label">
            Max Duration (seconds)
            <input
              value={maxDurationSeconds}
              onChange={(e) => setMaxDurationSeconds(e.target.value)}
              type="number"
              min="0"
              placeholder="120"
              className="operator-reports-input"
            />
          </label>
        </div>

        <div className="operator-reports-check-row">
          <label className="operator-reports-check-label">
            <input
              type="checkbox"
              checked={includeUnscheduled}
              onChange={(e) => setIncludeUnscheduled(e.target.checked)}
            />
            Include unscheduled
          </label>

          <label className="operator-reports-check-label">
            <input
              type="checkbox"
              checked={includeMissed}
              onChange={(e) => setIncludeMissed(e.target.checked)}
            />
            Include missed
          </label>
        </div>

        {rangeError ? <div className="operator-reports-warning-box">{rangeError}</div> : null}
        {durationError ? <div className="operator-reports-warning-box">{durationError}</div> : null}

        <div className="operator-reports-action-row">
          <button
            className="operator-reports-secondary-btn"
            disabled={!canPreview}
            onClick={() => void loadPreview()}
          >
            {loadingPreview ? "Loading Preview..." : "Preview Rows"}
          </button>

          <button
            className="operator-reports-primary-btn"
            disabled={!canExport}
            onClick={() => void downloadReport()}
          >
            {loadingExport ? "Exporting..." : "Export Report"}
          </button>
        </div>

        <div className="operator-reports-hint">
          Preview uses <code>POST /api/v1/reports/preview</code>. Export uses{" "}
          <code>POST /api/v1/reports/generate</code>.
        </div>
      </OperatorCard>

      <OperatorCard
        title="Preview Summary"
        subtitle="Quick summary of the currently filtered playback records."
      >
        {previewPayload ? (
          <div className="operator-reports-preview-panel">
            <div><b>Format:</b> {previewPayload.format.toUpperCase()}</div>
            <div><b>From:</b> {formatDateTime(previewPayload.from_ts)}</div>
            <div><b>To:</b> {formatDateTime(previewPayload.to_ts)}</div>
            <div><b>Channel:</b> {channelId || "All channels"}</div>
            <div><b>Advertiser:</b> {advertiserName.trim() || "All advertisers"}</div>
            <div><b>Status:</b> {status || "All statuses"}</div>
            <div><b>Min Duration:</b> {minDurationSeconds || "None"}</div>
            <div><b>Max Duration:</b> {maxDurationSeconds || "None"}</div>
            <div>
              <b>Filename Preview:</b>{" "}
              {buildReportFilename(previewPayload.format, previewPayload.from_ts, previewPayload.to_ts)}
            </div>
          </div>
        ) : (
          <div className="operator-reports-muted">
            Enter a valid range to preview report settings.
          </div>
        )}

        {previewSummary ? (
          <div className="operator-reports-summary-grid">
            <div className="operator-reports-summary-card">
              <div className="operator-reports-summary-value">{previewSummary.total_rows}</div>
              <div className="operator-reports-summary-label">Playback Rows</div>
            </div>

            <div className="operator-reports-summary-card">
              <div className="operator-reports-summary-value">{previewSummary.unique_advertisers}</div>
              <div className="operator-reports-summary-label">Advertisers</div>
            </div>

            <div className="operator-reports-summary-card">
              <div className="operator-reports-summary-value">{previewSummary.unique_videos}</div>
              <div className="operator-reports-summary-label">Videos</div>
            </div>

            <div className="operator-reports-summary-card">
              <div className="operator-reports-summary-value">{previewSummary.unique_channels}</div>
              <div className="operator-reports-summary-label">Channels</div>
            </div>

            <div className="operator-reports-summary-card">
              <div className="operator-reports-summary-value">{previewSummary.screenshot_count}</div>
              <div className="operator-reports-summary-label">Screenshots</div>
            </div>
          </div>
        ) : null}
      </OperatorCard>

      <OperatorCard
        title="Playback Rows Preview"
        subtitle="These rows should come from the real detection/playback log, including screenshot evidence."
      >
        {previewRows.length === 0 ? (
          <div className="operator-reports-muted">
            No preview rows loaded yet.
          </div>
        ) : (
          <div className="operator-reports-table-wrap">
            <table className="operator-reports-table">
              <thead>
                <tr>
                  <th className="operator-reports-th">Advertiser</th>
                  <th className="operator-reports-th">Video</th>
                  <th className="operator-reports-th">Channel</th>
                  <th className="operator-reports-th">Played At</th>
                  <th className="operator-reports-th">Duration</th>
                  <th className="operator-reports-th">Status</th>
                  <th className="operator-reports-th">Confidence</th>
                  <th className="operator-reports-th">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id} className="operator-reports-tr">
                    <td className="operator-reports-td">{row.advertiser_name}</td>
                    <td className="operator-reports-td">{row.video_name}</td>
                    <td className="operator-reports-td">{row.channel_name}</td>
                    <td className="operator-reports-td">
                      <div>{formatDateTime(row.played_at)}</div>
                      <div className="operator-reports-subtext">
                        {row.played_date} • {row.played_time}
                      </div>
                    </td>
                    <td className="operator-reports-td">{formatDuration(row.duration_seconds)}</td>
                    <td className="operator-reports-td">{row.status}</td>
                    <td className="operator-reports-td">{formatConfidence(row.confidence)}</td>
                    <td className="operator-reports-td">
                      {row.screenshot_path ? (
                        <a
                          href={row.screenshot_path}
                          target="_blank"
                          rel="noreferrer"
                          className="operator-reports-link"
                        >
                          View Screenshot
                        </a>
                      ) : (
                        <span className="operator-reports-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperatorCard>

      <OperatorCard
        title="Recent Export History"
        subtitle="Recently exported playback reports in this browser session."
      >
        {history.length === 0 ? (
          <div className="operator-reports-muted">
            No reports exported yet in this session.
          </div>
        ) : (
          <div className="operator-reports-table-wrap">
            <table className="operator-reports-table">
              <thead>
                <tr>
                  <th className="operator-reports-th">Filename</th>
                  <th className="operator-reports-th">Generated At</th>
                  <th className="operator-reports-th">Format</th>
                  <th className="operator-reports-th">Range</th>
                  <th className="operator-reports-th">Filters</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="operator-reports-tr">
                    <td className="operator-reports-td-mono">{item.filename}</td>
                    <td className="operator-reports-td">{formatDateTime(item.created_at)}</td>
                    <td className="operator-reports-td">{item.format.toUpperCase()}</td>
                    <td className="operator-reports-td">
                      {formatDateTime(item.from_ts)} <b>to</b> {formatDateTime(item.to_ts)}
                    </td>
                    <td className="operator-reports-td">
                      <div>Channel: {item.channel_id || "All"}</div>
                      <div>Advertiser: {item.advertiser_name || "All"}</div>
                      <div>Status: {item.status || "All"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OperatorCard>
    </div>
  );
}