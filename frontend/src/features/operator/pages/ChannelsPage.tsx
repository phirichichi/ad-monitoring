// frontend/src/features/operator/pages/ChannelsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { OperatorApi } from "../../../api/operator";
import type { Channel, UpdateChannelRequest } from "../../../api/types";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import OperatorCard from "../components/OperatorCard";
import OperatorSectionHeader from "../components/OperatorSectionHeader";
import StatusBadge from "../components/StatusBadge";
import "../../../styles/operator/ChannelsPage.css";

type FormState = {
  name: string;
  slug: string;
  stream_url: string;
  timezone: string;
};

type EditableChannelState = {
  id: string;
  name: string;
  slug: string;
  stream_url: string;
  timezone: string;
  is_active: boolean;
};

const DEFAULT_FORM: FormState = {
  name: "",
  slug: "",
  stream_url: "",
  timezone: "UTC",
};

/**
 * Normalizes a channel name/slug into a URL-safe slug.
 */
function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Light URL validation for operator-side form protection.
 * Accepts RTMP, RTSP, HLS/http(s), and file URLs.
 */
function isValidStreamUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  return /^(https?:\/\/|rtmp:\/\/|rtsp:\/\/|file:\/\/)/i.test(trimmed);
}

/**
 * Basic timezone validation.
 * This uses Intl to verify that the provided timezone exists.
 */
function isValidTimezone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects stream source type from URL.
 */
function getSourceType(streamUrl?: string): "RTMP" | "HLS/HTTP" | "FILE" | "UNKNOWN" {
  const value = (streamUrl || "").trim().toLowerCase();

  if (!value) return "UNKNOWN";
  if (value.startsWith("rtmp://") || value.startsWith("rtsp://")) return "RTMP";
  if (value.startsWith("http://") || value.startsWith("https://")) return "HLS/HTTP";
  if (value.startsWith("file://")) return "FILE";
  return "UNKNOWN";
}

/**
 * Safely extracts a simple last-seen string from channel health metadata if available.
 */
function getLastSeen(channel: Channel): string {
  const health = channel.health_status;

  if (health && typeof health === "object") {
    const record = health as Record<string, unknown>;
    const candidate = record["last_seen_at"];

    if (typeof candidate === "string" && candidate.trim()) {
      const date = new Date(candidate);
      return Number.isNaN(date.getTime()) ? candidate : date.toLocaleString();
    }
  }

  return channel.updated_at ? new Date(channel.updated_at).toLocaleString() : "-";
}

/**
 * Safely extracts a monitoring-enabled flag if backend provides it inside health_status.
 * Falls back to active state for now.
 */
function isMonitoringEnabled(channel: Channel): boolean {
  const health = channel.health_status;

  if (health && typeof health === "object") {
    const record = health as Record<string, unknown>;
    if (typeof record["monitoring_enabled"] === "boolean") {
      return record["monitoring_enabled"];
    }
  }

  return channel.is_active ?? false;
}

/**
 * Extracts a simple stream health label from the channel record.
 */
function getHealthLabel(channel: Channel): string {
  if (typeof channel.status === "string" && channel.status.trim()) {
    return channel.status.trim();
  }

  if (channel.is_active === false) return "offline";
  if (channel.is_active === true) return "online";
  return "unknown";
}

/**
 * Copies text to clipboard with a small compatibility fallback.
 */
async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

export default function ChannelsPage() {
  const [items, setItems] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditableChannelState | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const streamUrlError = useMemo(() => {
    if (isValidStreamUrl(form.stream_url)) return null;
    return "Stream URL must start with http://, https://, rtmp://, rtsp://, or file://";
  }, [form.stream_url]);

  const timezoneError = useMemo(() => {
    if (isValidTimezone(form.timezone)) return null;
    return "Timezone is invalid. Example: UTC, Africa/Lusaka, Europe/London";
  }, [form.timezone]);

  const canSubmit = useMemo(() => {
    return form.name.trim().length > 0 && !streamUrlError && !timezoneError && !creating;
  }, [form.name, streamUrlError, timezoneError, creating]);

  /**
   * Loads channel records from the backend.
   */
  async function refresh(showLoader = true) {
    setErr(null);

    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await OperatorApi.listChannels();
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, showActiveOnly]);

  /**
   * Creates a new channel from the form.
   */
  async function onCreate() {
    if (!canSubmit) return;

    setErr(null);
    setSuccess(null);
    setCreating(true);

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() ? normalizeSlug(form.slug) : undefined,
        stream_url: form.stream_url.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
      };

      await OperatorApi.createChannel(payload);

      setForm(DEFAULT_FORM);
      setSuccess("Channel created successfully.");
      await refresh(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  /**
   * Puts a row into edit mode.
   */
  function startEdit(channel: Channel) {
    setErr(null);
    setSuccess(null);
    setEditingId(channel.id);
    setEditForm({
      id: channel.id,
      name: channel.name,
      slug: channel.slug ?? "",
      stream_url: channel.stream_url ?? "",
      timezone: channel.timezone ?? "UTC",
      is_active: channel.is_active ?? false,
    });
  }

  /**
   * Cancels row editing.
   */
  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  /**
   * Saves edits for the currently edited row.
   */
  async function saveEdit() {
    if (!editForm) return;

    if (!editForm.name.trim()) {
      setErr("Channel name is required.");
      return;
    }

    if (!isValidStreamUrl(editForm.stream_url)) {
      setErr("Edit failed: invalid stream URL.");
      return;
    }

    if (!isValidTimezone(editForm.timezone)) {
      setErr("Edit failed: invalid timezone.");
      return;
    }

    setErr(null);
    setSuccess(null);
    setUpdatingId(editForm.id);

    try {
      const payload: UpdateChannelRequest = {
        name: editForm.name.trim(),
        slug: editForm.slug.trim() ? normalizeSlug(editForm.slug) : undefined,
        stream_url: editForm.stream_url.trim() || undefined,
        timezone: editForm.timezone.trim() || undefined,
        is_active: editForm.is_active,
      };

      await OperatorApi.updateChannel(editForm.id, payload);

      setSuccess("Channel updated successfully.");
      cancelEdit();
      await refresh(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  /**
   * Toggles a channel active/inactive.
   */
  async function toggleActive(channel: Channel) {
    setErr(null);
    setSuccess(null);
    setUpdatingId(channel.id);

    try {
      const nextIsActive = !(channel.is_active ?? false);

      await OperatorApi.updateChannel(channel.id, {
        is_active: nextIsActive,
      });

      setSuccess(
        nextIsActive
          ? `${channel.name} activated successfully.`
          : `${channel.name} deactivated successfully.`,
      );

      await refresh(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update active state");
    } finally {
      setUpdatingId(null);
    }
  }

  /**
   * Simulates a stream test action for operator workflow readiness.
   * Replace with a real backend endpoint later.
   */
  async function onTestStream(channel: Channel) {
    setErr(null);
    setSuccess(null);

    if (!channel.stream_url) {
      setErr(`Cannot test stream for ${channel.name}: no stream URL configured.`);
      return;
    }

    if (!isValidStreamUrl(channel.stream_url)) {
      setErr(`Cannot test stream for ${channel.name}: invalid stream URL.`);
      return;
    }

    setSuccess(`Test stream started for ${channel.name}. Replace this with a real backend endpoint later.`);
  }

  /**
   * Copies the channel ID for quick operator/admin use.
   */
  async function onCopyId(id: string) {
    setErr(null);

    try {
      await copyText(id);
      setSuccess("Channel ID copied to clipboard.");
    } catch {
      setErr("Failed to copy channel ID.");
    }
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((channel) => {
      const matchesSearch =
        !term ||
        channel.name.toLowerCase().includes(term) ||
        (channel.slug ?? "").toLowerCase().includes(term) ||
        (channel.stream_url ?? "").toLowerCase().includes(term) ||
        channel.id.toLowerCase().includes(term);

      const matchesActive = !showActiveOnly || (channel.is_active ?? false);

      return matchesSearch && matchesActive;
    });
  }, [items, search, showActiveOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const pagedItems = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="operator-channels-page">
      <OperatorSectionHeader
        title="Channels"
        subtitle="Create, review, update, and monitor channel configuration for operator workflows."
        action={
          <button
            type="button"
            className="operator-channels-secondary-btn"
            onClick={() => void refresh(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      {(err || success) && (
        <div className="operator-channels-message-wrap">
          {err ? <ErrorMessage message={err} /> : null}
          {success ? <div className="operator-channels-success-box">{success}</div> : null}
        </div>
      )}

      <OperatorCard
        title="Create Channel"
        subtitle="Basic channel setup. Extra fields stay compatible with future backend expansion."
      >
        <div className="operator-channels-form-grid">
          <label className="operator-channels-label">
            Name
            <input
              className="operator-channels-input"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;

                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: prev.slug ? prev.slug : normalizeSlug(name),
                }));
              }}
              placeholder="ZNBC 1"
            />
          </label>

          <label className="operator-channels-label">
            Slug
            <input
              className="operator-channels-input"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="znbc-1"
            />
          </label>

          <label className="operator-channels-label">
            Stream URL
            <input
              className="operator-channels-input"
              value={form.stream_url}
              onChange={(e) => setForm((prev) => ({ ...prev, stream_url: e.target.value }))}
              placeholder="rtmp://..., https://..., or file:///videos/sample.mp4"
            />
            {streamUrlError ? <span className="operator-channels-field-error">{streamUrlError}</span> : null}
          </label>

          <label className="operator-channels-label">
            Timezone
            <input
              className="operator-channels-input"
              value={form.timezone}
              onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
              placeholder="UTC or Africa/Lusaka"
            />
            {timezoneError ? <span className="operator-channels-field-error">{timezoneError}</span> : null}
          </label>
        </div>

        <div className="operator-channels-action-row">
          <button
            type="button"
            className="operator-channels-primary-btn"
            style={{ opacity: canSubmit ? 1 : 0.65 }}
            disabled={!canSubmit}
            onClick={() => void onCreate()}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </OperatorCard>

      <OperatorCard
        title="All Channels"
        subtitle="Search, review, copy channel IDs, edit channel data, and toggle active status."
      >
        <div className="operator-channels-toolbar">
          <input
            className="operator-channels-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, stream URL, or ID"
          />

          <label className="operator-channels-checkbox-label">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
            Active only
          </label>
        </div>

        {loading ? (
          <div className="operator-channels-muted">Loading channels...</div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No channels found"
            description="Try clearing the search/filter or create a new channel to get started."
          />
        ) : (
          <>
            <div className="operator-channels-table-wrap">
              <table className="operator-channels-table">
                <thead>
                  <tr>
                    <th className="operator-channels-th">Name</th>
                    <th className="operator-channels-th">Slug</th>
                    <th className="operator-channels-th">Source</th>
                    <th className="operator-channels-th">Timezone</th>
                    <th className="operator-channels-th">Status</th>
                    <th className="operator-channels-th">Monitoring</th>
                    <th className="operator-channels-th">Last Seen</th>
                    <th className="operator-channels-th">ID</th>
                    <th className="operator-channels-th">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pagedItems.map((ch) => {
                    const isEditing = editingId === ch.id && editForm?.id === ch.id;
                    const sourceType = getSourceType(ch.stream_url);
                    const healthLabel = getHealthLabel(ch);
                    const monitoringEnabled = isMonitoringEnabled(ch);

                    return (
                      <tr key={ch.id} className="operator-channels-tr">
                        <td className="operator-channels-td">
                          {isEditing && editForm ? (
                            <input
                              className="operator-channels-inline-input"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, name: e.target.value } : prev,
                                )
                              }
                            />
                          ) : (
                            ch.name
                          )}
                        </td>

                        <td className="operator-channels-td-mono">
                          {isEditing && editForm ? (
                            <input
                              className="operator-channels-inline-input"
                              value={editForm.slug}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, slug: e.target.value } : prev,
                                )
                              }
                            />
                          ) : (
                            ch.slug ?? "-"
                          )}
                        </td>

                        <td className="operator-channels-td">{sourceType}</td>

                        <td className="operator-channels-td">
                          {isEditing && editForm ? (
                            <input
                              className="operator-channels-inline-input"
                              value={editForm.timezone}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, timezone: e.target.value } : prev,
                                )
                              }
                            />
                          ) : (
                            ch.timezone ?? "-"
                          )}
                        </td>

                        <td className="operator-channels-td">
                          <div className="operator-channels-status-group">
                            <StatusBadge
                              status={
                                healthLabel === "online"
                                  ? "online"
                                  : healthLabel === "offline"
                                    ? "offline"
                                    : healthLabel === "warning"
                                      ? "warning"
                                      : "unknown"
                              }
                              label={healthLabel}
                            />
                            <StatusBadge
                              status={ch.is_active ? "active" : "inactive"}
                              label={ch.is_active ? "active" : "inactive"}
                            />
                          </div>
                        </td>

                        <td className="operator-channels-td">
                          <StatusBadge
                            status={monitoringEnabled ? "active" : "inactive"}
                            label={monitoringEnabled ? "enabled" : "disabled"}
                          />
                        </td>

                        <td className="operator-channels-td">{getLastSeen(ch)}</td>

                        <td className="operator-channels-td-mono">
                          <div className="operator-channels-id-cell">
                            <span>{ch.id}</span>
                            <button
                              type="button"
                              className="operator-channels-copy-btn"
                              onClick={() => void onCopyId(ch.id)}
                            >
                              Copy
                            </button>
                          </div>
                        </td>

                        <td className="operator-channels-td">
                          <div className="operator-channels-actions-wrap">
                            {isEditing && editForm ? (
                              <>
                                <button
                                  type="button"
                                  className="operator-channels-small-primary-btn"
                                  disabled={updatingId === ch.id}
                                  onClick={() => void saveEdit()}
                                >
                                  {updatingId === ch.id ? "Saving..." : "Save"}
                                </button>

                                <button
                                  type="button"
                                  className="operator-channels-small-ghost-btn"
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="operator-channels-small-ghost-btn"
                                  onClick={() => startEdit(ch)}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="operator-channels-small-ghost-btn"
                                  onClick={() => void toggleActive(ch)}
                                  disabled={updatingId === ch.id}
                                >
                                  {ch.is_active ? "Deactivate" : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  className="operator-channels-small-ghost-btn"
                                  onClick={() => void onTestStream(ch)}
                                >
                                  Test Stream
                                </button>

                                <button
                                  type="button"
                                  className="operator-channels-small-ghost-btn"
                                  onClick={() => {
                                    setSuccess(
                                      `View action placeholder for ${ch.name}. Replace with route or drawer later.`,
                                    );
                                  }}
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  className="operator-channels-small-danger-btn"
                                  onClick={() => {
                                    setErr(
                                      `Delete action for ${ch.name} is a placeholder. Add a backend delete endpoint before enabling this.`,
                                    );
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="operator-channels-pagination-row">
              <div className="operator-channels-pagination-info">
                Showing {pagedItems.length} of {filteredItems.length} filtered channel(s)
              </div>

              <div className="operator-channels-pagination-controls">
                <button
                  type="button"
                  className="operator-channels-small-ghost-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>

                <span className="operator-channels-page-indicator">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="operator-channels-small-ghost-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        <div className="operator-channels-hint">
          Current backend supports list/create/update well. View, delete, monitoring toggle, and test stream are
          operator-ready placeholders until matching backend endpoints are added.
        </div>
      </OperatorCard>
    </div>
  );
}