//frontend/src/features/admin/pages/channelpages.tsx 
import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type { Channel, CreateChannelRequest, UpdateChannelRequest } from "../../../api/types";

type FormState = {
  name: string;
  slug: string;
  stream_url: string;
  timezone: string;
  is_active: boolean;
  monitoring_enabled: boolean;
  source_type: string;
};

type EditableChannelState = {
  id: string;
  name: string;
  slug: string;
  stream_url: string;
  timezone: string;
  is_active: boolean;
  monitoring_enabled: boolean;
  source_type: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  slug: "",
  stream_url: "",
  timezone: "Africa/Lusaka",
  is_active: true,
  monitoring_enabled: true,
  source_type: "hls",
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
 * Validates stream URLs used by the monitoring engine.
 */
function isValidStreamUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  return /^(https?:\/\/|rtmp:\/\/|rtsp:\/\/|file:\/\/)/i.test(trimmed);
}

/**
 * Validates timezone values using Intl.
 */
function isValidTimezone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects the source type from a stream URL when the admin does not set one manually.
 */
function inferSourceType(streamUrl: string): string {
  const value = streamUrl.trim().toLowerCase();

  if (value.startsWith("rtmp://") || value.startsWith("rtsp://")) return "rtmp";
  if (value.startsWith("http://") || value.startsWith("https://")) return "hls";
  if (value.startsWith("file://")) return "file";
  return "unknown";
}

/**
 * Formats timestamps safely.
 */
function formatDateTime(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

/**
 * Returns a friendly channel status label.
 */
function getStatusLabel(channel: Channel): string {
  if (typeof channel.status === "string" && channel.status.trim()) {
    return channel.status.trim();
  }

  if (channel.is_active === false) return "inactive";
  if (channel.is_active === true && channel.monitoring_enabled === false) return "configured";
  if (channel.is_active === true && channel.monitoring_enabled === true) return "linked";
  return "unknown";
}

export default function ChannelsPage() {
  const [items, setItems] = useState<Channel[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditableChannelState | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const streamUrlError = useMemo(() => {
    if (isValidStreamUrl(form.stream_url)) return null;
    return "Stream URL must start with http://, https://, rtmp://, rtsp://, or file://";
  }, [form.stream_url]);

  const timezoneError = useMemo(() => {
    if (isValidTimezone(form.timezone)) return null;
    return "Timezone is invalid. Example: Africa/Lusaka, UTC, Europe/London";
  }, [form.timezone]);

  const canCreate = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.slug.trim().length > 0 &&
      !streamUrlError &&
      !timezoneError &&
      !creating
    );
  }, [form.name, form.slug, streamUrlError, timezoneError, creating]);

  /**
   * Loads all channel records.
   */
  async function load() {
    setErr(null);

    try {
      setLoading(true);
      const data = await AdminApi.listChannels();
      setItems(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  /**
   * Creates a new linked monitoring channel.
   */
  async function onCreate() {
    if (!canCreate) return;

    setCreating(true);
    setErr(null);
    setSuccess(null);

    try {
      const payload: CreateChannelRequest = {
        name: form.name.trim(),
        slug: normalizeSlug(form.slug),
        stream_url: form.stream_url.trim(),
        timezone: form.timezone.trim(),
        is_active: form.is_active,
        monitoring_enabled: form.monitoring_enabled,
        source_type: form.source_type || inferSourceType(form.stream_url),
      };

      await AdminApi.createChannel(payload);

      setForm(DEFAULT_FORM);
      setSuccess("Channel created and linked for monitoring.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create channel");
    } finally {
      setCreating(false);
    }
  }

  /**
   * Enters edit mode for one row.
   */
  function startEdit(channel: Channel) {
    setEditingId(channel.id);
    setEditForm({
      id: channel.id,
      name: channel.name,
      slug: channel.slug ?? "",
      stream_url: channel.stream_url ?? "",
      timezone: channel.timezone ?? "Africa/Lusaka",
      is_active: channel.is_active ?? true,
      monitoring_enabled: channel.monitoring_enabled ?? true,
      source_type: channel.source_type ?? inferSourceType(channel.stream_url ?? ""),
    });
    setErr(null);
    setSuccess(null);
  }

  /**
   * Leaves edit mode without saving.
   */
  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  /**
   * Saves row changes.
   */
  async function saveEdit() {
    if (!editForm) return;

    if (!editForm.name.trim()) {
      setErr("Channel name is required.");
      return;
    }

    if (!editForm.slug.trim()) {
      setErr("Channel slug is required.");
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

    setUpdatingId(editForm.id);
    setErr(null);
    setSuccess(null);

    try {
      const payload: UpdateChannelRequest = {
        name: editForm.name.trim(),
        slug: normalizeSlug(editForm.slug),
        stream_url: editForm.stream_url.trim(),
        timezone: editForm.timezone.trim(),
        is_active: editForm.is_active,
        monitoring_enabled: editForm.monitoring_enabled,
        source_type: editForm.source_type || inferSourceType(editForm.stream_url),
      };

      await AdminApi.updateChannel(editForm.id, payload);

      setSuccess("Channel updated successfully.");
      cancelEdit();
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update channel");
    } finally {
      setUpdatingId(null);
    }
  }

  /**
   * Toggles whether the channel is monitored by the detection pipeline.
   */
  async function toggleMonitoring(channel: Channel) {
    setUpdatingId(channel.id);
    setErr(null);
    setSuccess(null);

    try {
      await AdminApi.updateChannel(channel.id, {
        monitoring_enabled: !(channel.monitoring_enabled ?? false),
      });

      setSuccess(
        channel.monitoring_enabled
          ? `${channel.name} monitoring disabled.`
          : `${channel.name} monitoring enabled.`,
      );

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update monitoring state");
    } finally {
      setUpdatingId(null);
    }
  }

  /**
   * Toggles whether the channel is active.
   */
  async function toggleActive(channel: Channel) {
    setUpdatingId(channel.id);
    setErr(null);
    setSuccess(null);

    try {
      await AdminApi.updateChannel(channel.id, {
        is_active: !(channel.is_active ?? false),
      });

      setSuccess(
        channel.is_active
          ? `${channel.name} deactivated.`
          : `${channel.name} activated.`,
      );

      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update active state");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Channels</h2>
          <p style={styles.sub}>
            Link broadcast channels to the monitoring engine by defining feed URL,
            source type, timezone, and monitoring state.
          </p>
        </div>

        <button style={styles.secondaryBtn} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {(err || success) && (
        <div style={styles.messageWrap}>
          {err ? <div style={styles.errorBox}>{err}</div> : null}
          {success ? <div style={styles.successBox}>{success}</div> : null}
        </div>
      )}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Create Monitoring Channel</h3>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Channel Name
            <input
              value={form.name}
              onChange={(e) => {
                const value = e.target.value;

                setForm((prev) => ({
                  ...prev,
                  name: value,
                  slug: prev.slug ? prev.slug : normalizeSlug(value),
                }));
              }}
              placeholder="Example: ZNBC News"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Slug
            <input
              value={form.slug}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  slug: e.target.value,
                }))
              }
              placeholder="znbc-news"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Stream URL
            <input
              value={form.stream_url}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  stream_url: e.target.value,
                  source_type: inferSourceType(e.target.value),
                }))
              }
              placeholder="https://... , rtmp://... , rtsp://... , file://..."
              style={styles.input}
            />
            {streamUrlError ? <span style={styles.fieldError}>{streamUrlError}</span> : null}
          </label>

          <label style={styles.label}>
            Timezone
            <input
              value={form.timezone}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  timezone: e.target.value,
                }))
              }
              placeholder="Africa/Lusaka"
              style={styles.input}
            />
            {timezoneError ? <span style={styles.fieldError}>{timezoneError}</span> : null}
          </label>

          <label style={styles.label}>
            Source Type
            <select
              value={form.source_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  source_type: e.target.value,
                }))
              }
              style={styles.input}
            >
              <option value="hls">hls</option>
              <option value="rtmp">rtmp</option>
              <option value="file">file</option>
              <option value="unknown">unknown</option>
            </select>
          </label>

          <div style={styles.toggleGrid}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              Channel active
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.monitoring_enabled}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    monitoring_enabled: e.target.checked,
                  }))
                }
              />
              Monitoring enabled
            </label>
          </div>
        </div>

        <div style={styles.actionRow}>
          <button
            style={{ ...styles.primaryBtn, opacity: canCreate ? 1 : 0.65 }}
            disabled={!canCreate}
            onClick={() => void onCreate()}
          >
            {creating ? "Creating..." : "Create Channel Link"}
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Linked Channels</h3>

        {loading ? (
          <div style={styles.muted}>Loading channels...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Slug</th>
                  <th style={styles.th}>Stream URL</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Timezone</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Monitoring</th>
                  <th style={styles.th}>Last Seen</th>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((channel) => {
                  const isEditing = editingId === channel.id && editForm?.id === channel.id;

                  return (
                    <tr key={channel.id} style={styles.tr}>
                      <td style={styles.td}>
                        {isEditing && editForm ? (
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev,
                              )
                            }
                            style={styles.inlineInput}
                          />
                        ) : (
                          channel.name
                        )}
                      </td>

                      <td style={styles.tdMono}>
                        {isEditing && editForm ? (
                          <input
                            value={editForm.slug}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, slug: e.target.value } : prev,
                              )
                            }
                            style={styles.inlineInput}
                          />
                        ) : (
                          channel.slug ?? "-"
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing && editForm ? (
                          <input
                            value={editForm.stream_url}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      stream_url: e.target.value,
                                      source_type: inferSourceType(e.target.value),
                                    }
                                  : prev,
                              )
                            }
                            style={styles.inlineInput}
                          />
                        ) : (
                          channel.stream_url ?? "-"
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing && editForm ? (
                          <select
                            value={editForm.source_type}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, source_type: e.target.value } : prev,
                              )
                            }
                            style={styles.inlineInput}
                          >
                            <option value="hls">hls</option>
                            <option value="rtmp">rtmp</option>
                            <option value="file">file</option>
                            <option value="unknown">unknown</option>
                          </select>
                        ) : (
                          channel.source_type ?? inferSourceType(channel.stream_url ?? "")
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing && editForm ? (
                          <input
                            value={editForm.timezone}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, timezone: e.target.value } : prev,
                              )
                            }
                            style={styles.inlineInput}
                          />
                        ) : (
                          channel.timezone ?? "-"
                        )}
                      </td>

                      <td style={styles.td}>{getStatusLabel(channel)}</td>

                      <td style={styles.td}>
                        {(channel.monitoring_enabled ?? false) ? "Enabled" : "Disabled"}
                      </td>

                      <td style={styles.td}>
                        {formatDateTime(channel.last_seen_at ?? channel.updated_at)}
                      </td>

                      <td style={styles.tdMono}>{channel.id}</td>

                      <td style={styles.td}>
                        <div style={styles.actionsWrap}>
                          {isEditing && editForm ? (
                            <>
                              <label style={styles.inlineCheckLabel}>
                                <input
                                  type="checkbox"
                                  checked={editForm.is_active}
                                  onChange={(e) =>
                                    setEditForm((prev) =>
                                      prev ? { ...prev, is_active: e.target.checked } : prev,
                                    )
                                  }
                                />
                                Active
                              </label>

                              <label style={styles.inlineCheckLabel}>
                                <input
                                  type="checkbox"
                                  checked={editForm.monitoring_enabled}
                                  onChange={(e) =>
                                    setEditForm((prev) =>
                                      prev
                                        ? { ...prev, monitoring_enabled: e.target.checked }
                                        : prev,
                                    )
                                  }
                                />
                                Monitoring
                              </label>

                              <button
                                type="button"
                                style={styles.smallPrimaryBtn}
                                disabled={updatingId === channel.id}
                                onClick={() => void saveEdit()}
                              >
                                {updatingId === channel.id ? "Saving..." : "Save"}
                              </button>

                              <button
                                type="button"
                                style={styles.smallGhostBtn}
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                style={styles.smallGhostBtn}
                                onClick={() => startEdit(channel)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                style={styles.smallGhostBtn}
                                disabled={updatingId === channel.id}
                                onClick={() => void toggleMonitoring(channel)}
                              >
                                {(channel.monitoring_enabled ?? false) ? "Disable Monitoring" : "Enable Monitoring"}
                              </button>

                              <button
                                type="button"
                                style={styles.smallGhostBtn}
                                disabled={updatingId === channel.id}
                                onClick={() => void toggleActive(channel)}
                              >
                                {(channel.is_active ?? false) ? "Deactivate" : "Activate"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!items.length && (
                  <tr>
                    <td colSpan={10} style={{ ...styles.td, opacity: 0.7 }}>
                      No channels yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.hint}>
          This page links broadcast channels to the detection pipeline by storing the
          feed URL, source type, timezone, monitoring flag, and activation state.
          A test feed action can be added next when the backend exposes a validation endpoint.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 18 },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  h2: { margin: 0, color: "#0d47a1" },
  sub: { margin: "6px 0 0 0", color: "#555", fontSize: 13 },
  messageWrap: {
    display: "grid",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    marginBottom: 16,
  },
  cardTitle: {
    margin: 0,
    marginBottom: 12,
    color: "#0d47a1",
    fontSize: 16,
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 6,
    fontSize: 12,
    color: "#444",
    fontWeight: 600,
  },
  input: {
    padding: 10,
    minWidth: 240,
    borderRadius: 10,
    border: "1px solid #d0d7e2",
    outline: "none",
    background: "#fff",
  },
  inlineInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d0d7e2",
    outline: "none",
    background: "#fff",
    fontSize: 12,
    boxSizing: "border-box",
  },
  fieldError: {
    fontSize: 12,
    color: "#b00020",
    fontWeight: 600,
  },
  toggleGrid: {
    display: "grid",
    gap: 12,
    alignContent: "center",
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#333",
    fontWeight: 600,
  },
  inlineCheckLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#333",
    fontWeight: 600,
  },
  actionRow: {
    display: "flex",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
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
  smallPrimaryBtn: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "7px 10px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  smallGhostBtn: {
    background: "#fff",
    color: "#0d47a1",
    border: "1px solid #cfe1ff",
    borderRadius: 8,
    padding: "7px 10px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  successBox: {
    background: "#e8f5e9",
    border: "1px solid #c8e6c9",
    padding: 10,
    borderRadius: 10,
    color: "#1b5e20",
    fontSize: 13,
  },
  errorBox: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    padding: 10,
    borderRadius: 10,
    color: "#7a0000",
    fontSize: 13,
  },
  muted: { color: "#666", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, fontSize: 13, color: "#333" },
  tr: { borderTop: "1px solid #f0f2f5" },
  td: { padding: 10, fontSize: 13, color: "#111", verticalAlign: "top" },
  tdMono: {
    padding: 10,
    fontSize: 12,
    color: "#111",
    fontFamily: "monospace",
    verticalAlign: "top",
  },
  actionsWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  hint: { marginTop: 12, fontSize: 12, color: "#666" },
};