import { useCallback, useEffect, useMemo, useState } from "react";
import "./../../styles/admin/HomePage.css";

import AdsPage from "./pages/AdsPage";
import ChannelsPage from "./pages/ChannelsPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import PlaylistsPage from "./pages/PlaylistsPage";

import { AdminApi } from "../../api/admin";
import type { Channel, PlaybackLog, PlaybackStatus } from "../../api/types";

type UserRole = "admin" | "operator" | "client";
type TokenType = "access" | "refresh";

type JWTPayload = {
  sub: string;
  role: UserRole | string;
  type?: TokenType;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
};

type AdminPageKey =
  | "dashboard"
  | "users"
  | "channels"
  | "ads"
  | "playlists"
  | "reports";

const AUTO_REFRESH_OPTIONS = [5, 10, 15, 30, 60] as const;

/**
 * Safely decodes a JWT payload.
 * This is only for dashboard/session display and not for auth validation.
 */
function safeDecodeJwt(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payloadB64 = parts[1];
    if (!payloadB64) return null;

    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;

    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);

    if (!parsed || typeof parsed !== "object") return null;

    const p = parsed as Partial<JWTPayload>;
    if (typeof p.sub !== "string") return null;
    if (typeof p.role !== "string") return null;

    return p as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Formats date/time values safely.
 */
function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

/**
 * Formats a duration in seconds.
 */
function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${seconds}s`;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Returns a class name for the playback status pill.
 */
function getStatusClass(status: PlaybackStatus): string {
  switch (status) {
    case "matched":
      return "admin-home__status-pill admin-home__status-pill--matched";
    case "partial":
      return "admin-home__status-pill admin-home__status-pill--partial";
    case "missed":
      return "admin-home__status-pill admin-home__status-pill--missed";
    case "unscheduled":
      return "admin-home__status-pill admin-home__status-pill--unscheduled";
    case "verified":
      return "admin-home__status-pill admin-home__status-pill--verified";
    case "rejected":
      return "admin-home__status-pill admin-home__status-pill--rejected";
    default:
      return "admin-home__status-pill";
  }
}

function NavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`admin-home__nav-btn ${active ? "admin-home__nav-btn--active" : ""}`}
      type="button"
    >
      {label}
    </button>
  );
}

export default function HomePage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const access = useMemo(() => localStorage.getItem("access_token") || "", []);
  const refresh = useMemo(() => localStorage.getItem("refresh_token") || "", []);
  const payload = useMemo(() => (access ? safeDecodeJwt(access) : null), [access]);

  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState<AdminPageKey>("dashboard");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [recentLogs, setRecentLogs] = useState<PlaybackLog[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [refreshSeconds, setRefreshSeconds] = useState<number>(10);
  const [windowMinutes, setWindowMinutes] = useState<number>(15);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  const expText = useMemo(() => {
    const exp = payload?.exp;
    if (!exp || typeof exp !== "number") return "N/A";
    return new Date(exp * 1000).toLocaleString();
  }, [payload]);

  const roleLabel = payload?.role ?? "N/A";

  /**
   * Reloads only the recent monitoring feed.
   * Wrapped in useCallback so it can safely be used in effects.
   */
  const loadRecentFeed = useCallback(async () => {
    try {
      setMonitoringLoading(true);
      setDashboardError(null);

      const logData = await AdminApi.listRecentPlaybackLogs(
        windowMinutes,
        selectedChannelId || null,
      );

      const sortedLogs = [...logData].sort((a, b) => {
        const ta = new Date(a.played_at).getTime();
        const tb = new Date(b.played_at).getTime();
        return tb - ta;
      });

      setRecentLogs(sortedLogs);
      setLastRefreshAt(new Date().toISOString());
    } catch (e: unknown) {
      setDashboardError(
        e instanceof Error ? e.message : "Failed to load recent monitoring feed",
      );
    } finally {
      setMonitoringLoading(false);
    }
  }, [windowMinutes, selectedChannelId]);

  /**
   * Loads dashboard reference data and initial recent captures.
   * Wrapped in useCallback so it can safely be used in effects.
   */
  const loadDashboardData = useCallback(async () => {
    try {
      setDashboardError(null);

      const [channelData, logData] = await Promise.all([
        AdminApi.listChannels(),
        AdminApi.listRecentPlaybackLogs(windowMinutes, selectedChannelId || null),
      ]);

      const sortedLogs = [...logData].sort((a, b) => {
        const ta = new Date(a.played_at).getTime();
        const tb = new Date(b.played_at).getTime();
        return tb - ta;
      });

      setChannels(channelData);
      setRecentLogs(sortedLogs);
      setLastRefreshAt(new Date().toISOString());
    } catch (e: unknown) {
      setDashboardError(
        e instanceof Error ? e.message : "Failed to load admin dashboard data",
      );
    }
  }, [windowMinutes, selectedChannelId]);

  useEffect(() => {
    if (page !== "dashboard") return;
    void loadDashboardData();
  }, [page, loadDashboardData]);

  useEffect(() => {
    if (page !== "dashboard") return;
    void loadRecentFeed();
  }, [page, loadRecentFeed]);

  useEffect(() => {
    if (page !== "dashboard") return;

    const timer = window.setInterval(() => {
      void loadRecentFeed();
    }, refreshSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [page, refreshSeconds, loadRecentFeed]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  const dashboardSummary = useMemo(() => {
    return {
      totalChannels: channels.length,
      activeChannels: channels.filter((item) => item.is_active).length,
      monitoringEnabled: channels.filter((item) => item.monitoring_enabled).length,
      detectionsInWindow: recentLogs.length,
      matchedInWindow: recentLogs.filter((item) => item.status === "matched").length,
      partialInWindow: recentLogs.filter((item) => item.status === "partial").length,
      missedInWindow: recentLogs.filter((item) => item.status === "missed").length,
      unscheduledInWindow: recentLogs.filter((item) => item.status === "unscheduled").length,
      withEvidence: recentLogs.filter(
        (item) => item.evidence_available || item.screenshot_url || item.screenshot_path,
      ).length,
    };
  }, [channels, recentLogs]);

  const content = (() => {
    switch (page) {
      case "users":
        return <UsersPage />;
      case "channels":
        return <ChannelsPage />;
      case "ads":
        return <AdsPage />;
      case "playlists":
        return <PlaylistsPage />;
      case "reports":
        return <ReportsPage />;

      case "dashboard":
      default:
        return (
          <>
            <div className="admin-home__summary-grid">
              <div className="admin-home__summary-card">
                <div className="admin-home__summary-value">{dashboardSummary.totalChannels}</div>
                <div className="admin-home__summary-label">Total Channels</div>
              </div>

              <div className="admin-home__summary-card">
                <div className="admin-home__summary-value">{dashboardSummary.activeChannels}</div>
                <div className="admin-home__summary-label">Active Channels</div>
              </div>

              <div className="admin-home__summary-card">
                <div className="admin-home__summary-value">{dashboardSummary.monitoringEnabled}</div>
                <div className="admin-home__summary-label">Monitoring Enabled</div>
              </div>

              <div className="admin-home__summary-card">
                <div className="admin-home__summary-value">{dashboardSummary.detectionsInWindow}</div>
                <div className="admin-home__summary-label">Captures in Window</div>
              </div>

              <div className="admin-home__summary-card">
                <div className="admin-home__summary-value">{dashboardSummary.matchedInWindow}</div>
                <div className="admin-home__summary-label">Matched</div>
              </div>

              <div className="admin-home__summary-card">
                <div className="admin-home__summary-value">{dashboardSummary.withEvidence}</div>
                <div className="admin-home__summary-label">Evidence Ready</div>
              </div>
            </div>

            <div className="admin-home__grid">
              <div className="admin-home__card">
                <h2 className="admin-home__card-title">Connection</h2>

                <div className="admin-home__kv">
                  <span className="admin-home__k">API Base URL</span>
                  <span className="admin-home__v">{apiBase}</span>
                </div>

                <div className="admin-home__kv">
                  <span className="admin-home__k">Access Token</span>
                  <span className="admin-home__v">
                    {access ? (
                      <span className="admin-home__ok">Present</span>
                    ) : (
                      <span className="admin-home__bad">Missing</span>
                    )}
                  </span>
                </div>

                <div className="admin-home__kv">
                  <span className="admin-home__k">Refresh Token</span>
                  <span className="admin-home__v">
                    {refresh ? (
                      <span className="admin-home__ok">Present</span>
                    ) : (
                      <span className="admin-home__bad">Missing</span>
                    )}
                  </span>
                </div>

                <div className="admin-home__button-row">
                  <button
                    className="admin-home__primary-btn"
                    disabled={!access}
                    onClick={async () => {
                      if (!access) return;
                      await navigator.clipboard.writeText(access);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                  >
                    {copied ? "Copied ✅" : "Copy Access Token"}
                  </button>

                  <button
                    className="admin-home__secondary-btn"
                    onClick={() => window.open(`${apiBase}/docs`, "_blank")}
                  >
                    Open API Docs
                  </button>

                  <button
                    className="admin-home__secondary-btn"
                    onClick={() => window.open(`${apiBase}/health/ready`, "_blank")}
                  >
                    Open Health Check
                  </button>
                </div>
              </div>

              <div className="admin-home__card">
                <h2 className="admin-home__card-title">Session</h2>

                {!payload && (
                  <div className="admin-home__notice">
                    Could not decode JWT payload. (If your token isn’t a JWT, this is normal.)
                  </div>
                )}

                <div className="admin-home__kv">
                  <span className="admin-home__k">User ID (sub)</span>
                  <span className="admin-home__v">{payload?.sub ?? "N/A"}</span>
                </div>

                <div className="admin-home__kv">
                  <span className="admin-home__k">Role</span>
                  <span className="admin-home__v">{payload?.role ?? "N/A"}</span>
                </div>

                <div className="admin-home__kv">
                  <span className="admin-home__k">Token Type</span>
                  <span className="admin-home__v">{payload?.type ?? "N/A"}</span>
                </div>

                <div className="admin-home__kv">
                  <span className="admin-home__k">Expires</span>
                  <span className="admin-home__v">{expText}</span>
                </div>

                <div className="admin-home__pre-wrap">
                  <div className="admin-home__small-label">Raw payload:</div>
                  <pre className="admin-home__pre">{JSON.stringify(payload ?? {}, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="admin-home__card">
              <div className="admin-home__top-row">
                <div>
                  <h2 className="admin-home__card-title">Live Ad Capture Feed</h2>
                  <p className="admin-home__sub">
                    Monitor automated detections linked to the currently running TV channel.
                  </p>
                </div>

                <button
                  className="admin-home__secondary-btn"
                  onClick={() => void loadRecentFeed()}
                >
                  Refresh Now
                </button>
              </div>

              {dashboardError ? (
                <div className="admin-home__error-box">{dashboardError}</div>
              ) : null}

              <div className="admin-home__controls-grid">
                <label className="admin-home__label">
                  Channel
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="admin-home__input"
                  >
                    <option value="">All channels</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-home__label">
                  Detection Window
                  <select
                    value={windowMinutes}
                    onChange={(e) => setWindowMinutes(Number(e.target.value))}
                    className="admin-home__input"
                  >
                    <option value={5}>Last 5 minutes</option>
                    <option value={15}>Last 15 minutes</option>
                    <option value={30}>Last 30 minutes</option>
                    <option value={60}>Last 60 minutes</option>
                    <option value={180}>Last 3 hours</option>
                  </select>
                </label>

                <label className="admin-home__label">
                  Auto Refresh
                  <select
                    value={refreshSeconds}
                    onChange={(e) => setRefreshSeconds(Number(e.target.value))}
                    className="admin-home__input"
                  >
                    {AUTO_REFRESH_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        Every {option}s
                      </option>
                    ))}
                  </select>
                </label>

                <div className="admin-home__status-box">
                  <div className="admin-home__status-label">Selected Channel</div>
                  <div className="admin-home__status-value">
                    {selectedChannel?.name || "All channels"}
                  </div>
                  <div className="admin-home__status-meta">
                    Last refresh: {lastRefreshAt ? formatDateTime(lastRefreshAt) : "Never"}
                  </div>
                </div>
              </div>

              <div className="admin-home__mini-summary-grid">
                <div className="admin-home__mini-summary-card">
                  <div className="admin-home__mini-summary-value">
                    {dashboardSummary.detectionsInWindow}
                  </div>
                  <div className="admin-home__mini-summary-label">Detections</div>
                </div>

                <div className="admin-home__mini-summary-card">
                  <div className="admin-home__mini-summary-value">
                    {dashboardSummary.matchedInWindow}
                  </div>
                  <div className="admin-home__mini-summary-label">Matched</div>
                </div>

                <div className="admin-home__mini-summary-card">
                  <div className="admin-home__mini-summary-value">
                    {dashboardSummary.partialInWindow}
                  </div>
                  <div className="admin-home__mini-summary-label">Partial</div>
                </div>

                <div className="admin-home__mini-summary-card">
                  <div className="admin-home__mini-summary-value">
                    {dashboardSummary.missedInWindow}
                  </div>
                  <div className="admin-home__mini-summary-label">Missed</div>
                </div>

                <div className="admin-home__mini-summary-card">
                  <div className="admin-home__mini-summary-value">
                    {dashboardSummary.unscheduledInWindow}
                  </div>
                  <div className="admin-home__mini-summary-label">Unscheduled</div>
                </div>

                <div className="admin-home__mini-summary-card">
                  <div className="admin-home__mini-summary-value">
                    {dashboardSummary.withEvidence}
                  </div>
                  <div className="admin-home__mini-summary-label">With Evidence</div>
                </div>
              </div>

              {monitoringLoading ? (
                <div className="admin-home__muted">Loading live feed...</div>
              ) : recentLogs.length === 0 ? (
                <div className="admin-home__empty-state">
                  No detections found in the selected time window.
                </div>
              ) : (
                <>
                  <div className="admin-home__feed-grid">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="admin-home__feed-card">
                        <div className="admin-home__feed-header">
                          <div>
                            <div className="admin-home__feed-title">{log.video_name}</div>
                            <div className="admin-home__feed-meta">
                              {log.advertiser_name} • {log.channel_name}
                            </div>
                          </div>

                          <span className={getStatusClass(log.status)}>{log.status}</span>
                        </div>

                        <div className="admin-home__feed-body">
                          <div className="admin-home__feed-field">
                            <span className="admin-home__feed-key">Played At</span>
                            <span className="admin-home__feed-value">
                              {formatDateTime(log.played_at)}
                            </span>
                          </div>

                          <div className="admin-home__feed-field">
                            <span className="admin-home__feed-key">Duration</span>
                            <span className="admin-home__feed-value">
                              {formatDuration(log.duration_seconds)}
                            </span>
                          </div>

                          <div className="admin-home__feed-field">
                            <span className="admin-home__feed-key">Confidence</span>
                            <span className="admin-home__feed-value">
                              {log.confidence !== null && log.confidence !== undefined
                                ? `${log.confidence.toFixed(1)}%`
                                : "-"}
                            </span>
                          </div>

                          <div className="admin-home__feed-field">
                            <span className="admin-home__feed-key">Evidence</span>
                            <span className="admin-home__feed-value">
                              {log.screenshot_url
                                ? "Screenshot available"
                                : log.screenshot_path
                                  ? "Stored on server"
                                  : "No evidence"}
                            </span>
                          </div>
                        </div>

                        {log.screenshot_url ? (
                          <a
                            href={log.screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-home__evidence-link"
                          >
                            Open Screenshot Evidence
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="admin-home__table-wrap">
                    <table className="admin-home__table">
                      <thead>
                        <tr>
                          <th className="admin-home__th">Channel</th>
                          <th className="admin-home__th">Advertiser</th>
                          <th className="admin-home__th">Video</th>
                          <th className="admin-home__th">Played At</th>
                          <th className="admin-home__th">Duration</th>
                          <th className="admin-home__th">Confidence</th>
                          <th className="admin-home__th">Status</th>
                          <th className="admin-home__th">Evidence</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentLogs.map((log) => (
                          <tr key={log.id} className="admin-home__tr">
                            <td className="admin-home__td">{log.channel_name}</td>
                            <td className="admin-home__td">{log.advertiser_name}</td>
                            <td className="admin-home__td">{log.video_name}</td>
                            <td className="admin-home__td admin-home__td--mono">
                              {formatDateTime(log.played_at)}
                            </td>
                            <td className="admin-home__td">{formatDuration(log.duration_seconds)}</td>
                            <td className="admin-home__td">
                              {log.confidence !== null && log.confidence !== undefined
                                ? `${log.confidence.toFixed(1)}%`
                                : "-"}
                            </td>
                            <td className="admin-home__td">{log.status}</td>
                            <td className="admin-home__td">
                              {log.screenshot_url ? (
                                <a
                                  href={log.screenshot_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="admin-home__evidence-link-inline"
                                >
                                  View
                                </a>
                              ) : log.screenshot_path ? (
                                <span className="admin-home__muted">Stored</span>
                              ) : (
                                <span className="admin-home__muted">None</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {!recentLogs.length && (
                          <tr>
                            <td colSpan={8} className="admin-home__td admin-home__td--empty">
                              No capture data available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        );
    }
  })();

  return (
    <div className="admin-home">
      <div className="admin-home__container">
        <div className="admin-home__header-row">
          <div>
            <h1 className="admin-home__title">Admin Dashboard</h1>
            <p className="admin-home__subtitle">
              Logged in ✅ <span className="admin-home__role-pill">{roleLabel}</span>
            </p>
          </div>

          <button
            className="admin-home__logout-btn"
            title="Logout (Sign out)"
            onClick={() => {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              window.location.reload();
            }}
          >
            <span className="admin-home__logout-icon" aria-hidden>
              ⎋
            </span>
            Logout (Sign out)
          </button>
        </div>

        <div className="admin-home__nav-row">
          <NavButton active={page === "dashboard"} label="Dashboard" onClick={() => setPage("dashboard")} />
          <NavButton active={page === "users"} label="Users" onClick={() => setPage("users")} />
          <NavButton active={page === "channels"} label="Channels" onClick={() => setPage("channels")} />
          <NavButton active={page === "ads"} label="Ads" onClick={() => setPage("ads")} />
          <NavButton active={page === "playlists"} label="Playlists" onClick={() => setPage("playlists")} />
          <NavButton active={page === "reports"} label="Reports" onClick={() => setPage("reports")} />
        </div>

        {content}

        <div className="admin-home__footer">
          <span>Admin workflow: Channels → Ads → Live Capture → Reports</span>
        </div>
      </div>
    </div>
  );
}