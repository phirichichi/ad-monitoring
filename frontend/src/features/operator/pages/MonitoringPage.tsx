// frontend/src/features/operator/pages/MonitoringPage.tsx

import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import OperatorCard from "../components/OperatorCard";
import OperatorSectionHeader from "../components/OperatorSectionHeader";
import StatusBadge from "../components/StatusBadge";
import { useMonitoringFeed } from "../hooks/useMonitoringFeed";
import type { MonitoringDetection } from "../../../api/types";
import "../../../styles/operator/MonitoringPage.css";

/**
 * Formats a timestamp to a readable local date/time string.
 */
function formatDateTime(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

/**
 * Formats latency for channel cards.
 */
function formatLatency(ms: number): string {
  if (ms <= 0) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Formats confidence score consistently.
 */
function formatConfidence(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(1)}%`;
}

/**
 * Builds simple operator-facing alert messages from recent detections.
 */
function buildAlerts(detections: MonitoringDetection[]): string[] {
  const alerts: string[] = [];

  const missed = detections.filter((item) => item.status === "missed").length;
  const partial = detections.filter((item) => item.status === "partial").length;
  const unscheduled = detections.filter((item) => item.status === "unscheduled").length;

  if (missed > 0) {
    alerts.push(`${missed} missed advertisement detection(s) need operator review.`);
  }

  if (partial > 0) {
    alerts.push(`${partial} partial match(es) detected. Check confidence and evidence.`);
  }

  if (unscheduled > 0) {
    alerts.push(`${unscheduled} unscheduled segment(s) detected. Verify playlist reconciliation.`);
  }

  if (alerts.length === 0) {
    alerts.push("No high-priority monitoring alerts right now.");
  }

  return alerts;
}

export default function MonitoringPage() {
  const { loading, error, channels, detections, summary, refresh } = useMonitoringFeed();

  const alerts = buildAlerts(detections);

  return (
    <div className="operator-monitoring-page">
      <OperatorSectionHeader
        title="Monitoring"
        subtitle="Track live channel health, recent detections, alerts, and evidence readiness."
        action={
          <button
            type="button"
            className="operator-monitoring-secondary-btn"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="operator-monitoring-error-wrap">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      <div className="operator-monitoring-summary-grid">
        <OperatorCard>
          <div className="operator-monitoring-metric-value">{summary.online_channels}</div>
          <div className="operator-monitoring-metric-label">Channels Online</div>
        </OperatorCard>

        <OperatorCard>
          <div className="operator-monitoring-metric-value">{summary.total_channels}</div>
          <div className="operator-monitoring-metric-label">Total Channels</div>
        </OperatorCard>

        <OperatorCard>
          <div className="operator-monitoring-metric-value">{summary.detections_today}</div>
          <div className="operator-monitoring-metric-label">Recent Detections</div>
        </OperatorCard>

        <OperatorCard>
          <div className="operator-monitoring-metric-value">{summary.partial_count}</div>
          <div className="operator-monitoring-metric-label">Partial Matches</div>
        </OperatorCard>

        <OperatorCard>
          <div className="operator-monitoring-metric-value">{summary.missed_count}</div>
          <div className="operator-monitoring-metric-label">Missed Ads</div>
        </OperatorCard>

        <OperatorCard>
          <div className="operator-monitoring-metric-value">{summary.unscheduled_count}</div>
          <div className="operator-monitoring-metric-label">Unscheduled</div>
        </OperatorCard>
      </div>

      <div className="operator-monitoring-grid-two">
        <OperatorCard
          title="Live Channel Status"
          subtitle="Channel reachability, latency, and current program context."
        >
          {loading ? (
            <div className="operator-monitoring-muted">Loading monitoring channels...</div>
          ) : channels.length === 0 ? (
            <EmptyState
              title="No channels available"
              description="Monitoring channels will appear here when the service starts reporting stream status."
            />
          ) : (
            <div className="operator-monitoring-channel-list">
              {channels.map((channel) => (
                <div key={channel.id} className="operator-monitoring-channel-row">
                  <div className="operator-monitoring-channel-main">
                    <div className="operator-monitoring-channel-name-row">
                      <strong className="operator-monitoring-channel-name">{channel.channel_name}</strong>
                      <StatusBadge status={channel.stream_status} />
                    </div>

                    <div className="operator-monitoring-channel-meta">
                      <span>
                        <b>Latency:</b> {formatLatency(channel.latency_ms)}
                      </span>
                      <span>
                        <b>Last seen:</b> {formatDateTime(channel.last_seen_at)}
                      </span>
                    </div>

                    <div className="operator-monitoring-channel-meta">
                      <span>
                        <b>Program:</b> {channel.current_program ?? "-"}
                      </span>
                      <span>
                        <b>Current Ad:</b> {channel.current_advertisement ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OperatorCard>

        <OperatorCard
          title="Alerts"
          subtitle="Operational issues that may require attention."
        >
          <div className="operator-monitoring-alert-list">
            {alerts.map((alert, index) => (
              <div key={`${alert}-${index}`} className="operator-monitoring-alert-item">
                {alert}
              </div>
            ))}
          </div>
        </OperatorCard>
      </div>

      <div className="operator-monitoring-grid-two-bottom">
        <OperatorCard
          title="Recent Detection Feed"
          subtitle="Latest advertisement matches, partial detections, and unscheduled events."
        >
          {loading ? (
            <div className="operator-monitoring-muted">Loading recent detections...</div>
          ) : detections.length === 0 ? (
            <EmptyState
              title="No detections yet"
              description="As soon as the monitoring engine reports detections, they will show here."
            />
          ) : (
            <div className="operator-monitoring-table-wrap">
              <table className="operator-monitoring-table">
                <thead>
                  <tr>
                    <th className="operator-monitoring-th">Time</th>
                    <th className="operator-monitoring-th">Channel</th>
                    <th className="operator-monitoring-th">Advertisement</th>
                    <th className="operator-monitoring-th">Status</th>
                    <th className="operator-monitoring-th">Confidence</th>
                    <th className="operator-monitoring-th">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.map((item) => (
                    <tr key={item.id} className="operator-monitoring-tr">
                      <td className="operator-monitoring-td-mono">{formatDateTime(item.detected_at)}</td>
                      <td className="operator-monitoring-td">{item.channel_name}</td>
                      <td className="operator-monitoring-td">{item.advertisement_name}</td>
                      <td className="operator-monitoring-td">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="operator-monitoring-td">{formatConfidence(item.confidence)}</td>
                      <td className="operator-monitoring-td">
                        {item.evidence_url ? (
                          <a
                            href={item.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                            className="operator-monitoring-link"
                          >
                            View
                          </a>
                        ) : (
                          <span className="operator-monitoring-muted-inline">Pending</span>
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
          title="Evidence Readiness"
          subtitle="Screenshot or clip availability from recent monitoring results."
        >
          {detections.length === 0 ? (
            <EmptyState
              title="No evidence available"
              description="Recent screenshots and proof-of-play media will appear here."
            />
          ) : (
            <div className="operator-monitoring-evidence-list">
              {detections.slice(0, 4).map((item) => (
                <div key={`evidence-${item.id}`} className="operator-monitoring-evidence-item">
                  <div className="operator-monitoring-evidence-thumb">
                    {item.evidence_url ? "IMG" : "N/A"}
                  </div>
                  <div className="operator-monitoring-evidence-body">
                    <div className="operator-monitoring-evidence-title">{item.advertisement_name}</div>
                    <div className="operator-monitoring-evidence-meta">
                      {item.channel_name} • {formatDateTime(item.detected_at)}
                    </div>
                    <div className="operator-monitoring-evidence-meta">
                      Status: <span className="operator-monitoring-evidence-strong">{item.status}</span> • Confidence:{" "}
                      {formatConfidence(item.confidence)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OperatorCard>
      </div>
    </div>
  );
}