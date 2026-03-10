import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorApi } from "../../../api/operator";
import type {
  Channel,
  PlaylistItem,
  PlaylistSchedule,
  PlaylistSource,
} from "../../../api/types";

export default function PlaylistsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [channelId, setChannelId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState<PlaylistSource>("manual");
  const [version, setVersion] = useState<number>(1);

  const [scheduleId, setScheduleId] = useState("");
  const [schedule, setSchedule] = useState<PlaylistSchedule | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);

  const [adId, setAdId] = useState("");
  const [startIso, setStartIso] = useState("");
  const [endIso, setEndIso] = useState("");
  const [durationMs, setDurationMs] = useState<number>(30000);

  const canCreateSchedule = useMemo(() => {
    return channelId.trim().length > 0 && scheduleDate.trim().length > 0 && version >= 1;
  }, [channelId, scheduleDate, version]);

  const canLoadSchedule = useMemo(() => scheduleId.trim().length > 0, [scheduleId]);

  const init = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const ch = await OperatorApi.listChannels();
      setChannels(ch);
      setChannelId((prev) => prev || (ch.length > 0 ? ch[0].id : ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  async function onCreateSchedule() {
    setErr(null);
    try {
      const created = await OperatorApi.createPlaylistSchedule({
        channel_id: channelId,
        schedule_date: scheduleDate,
        source,
        version,
        metadata: {},
      });
      setSchedule(created);
      setScheduleId(created.id);
      setItems([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create schedule failed");
    }
  }

  async function onLoadSchedule() {
    setErr(null);
    try {
      const s = await OperatorApi.getPlaylistSchedule(scheduleId.trim());
      const list = await OperatorApi.listPlaylistItems(scheduleId.trim());
      setSchedule(s);
      setItems(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load schedule failed");
    }
  }

  async function onCreateItem() {
    setErr(null);

    if (!schedule) {
      setErr("Create or load a schedule first.");
      return;
    }

    try {
      await OperatorApi.createPlaylistItem({
        playlist_schedule_id: schedule.id,
        channel_id: schedule.channel_id,
        advertisement_id: adId.trim(),
        expected_start_time: startIso.trim(),
        expected_end_time: endIso.trim(),
        expected_duration_ms: durationMs,
        position_in_break: null,
        break_id: null,
      });

      const updated = await OperatorApi.listPlaylistItems(schedule.id);
      setItems(updated);

      setAdId("");
      setStartIso("");
      setEndIso("");
      setDurationMs(30000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create item failed");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Playlists</h2>
          <p style={styles.sub}>Operator schedule workflow for Phase 2 playlist schedules and items.</p>
        </div>

        <button style={styles.secondaryBtn} onClick={() => void init()}>
          Refresh Channels
        </button>
      </div>

      {err && <div style={styles.errorBox}>{err}</div>}

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.h3}>Create Schedule</h3>

          <label style={styles.label}>
            Channel
            <select style={styles.input} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              {channels.length === 0 && <option value="">No channels</option>}
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Schedule Date
            <input style={styles.input} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
          </label>

          <label style={styles.label}>
            Source
            <select style={styles.input} value={source} onChange={(e) => setSource(e.target.value as PlaylistSource)}>
              <option value="manual">manual</option>
              <option value="automation_import">automation_import</option>
              <option value="api">api</option>
              <option value="recurring">recurring</option>
            </select>
          </label>

          <label style={styles.label}>
            Version
            <input
              style={styles.input}
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(Number(e.target.value))}
            />
          </label>

          <button
            type="button"
            style={{ ...styles.primaryBtn, opacity: canCreateSchedule ? 1 : 0.6 }}
            disabled={!canCreateSchedule}
            onClick={() => void onCreateSchedule()}
          >
            Create Schedule
          </button>

          {loading && <div style={styles.muted}>Loading...</div>}
        </div>

        <div style={styles.card}>
          <h3 style={styles.h3}>Load Schedule</h3>

          <label style={styles.label}>
            Schedule ID
            <input
              style={styles.input}
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              placeholder="UUID"
            />
          </label>

          <button
            type="button"
            style={{ ...styles.secondaryBtn, opacity: canLoadSchedule ? 1 : 0.6 }}
            disabled={!canLoadSchedule}
            onClick={() => void onLoadSchedule()}
          >
            Load
          </button>

          {schedule && (
            <div style={styles.summary}>
              <div><b>ID:</b> {schedule.id}</div>
              <div><b>Channel:</b> {schedule.channel_id}</div>
              <div><b>Date:</b> {schedule.schedule_date}</div>
              <div><b>Source:</b> {schedule.source}</div>
              <div><b>Version:</b> {schedule.version}</div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Add Schedule Item</h3>
        <p style={styles.sub}>Paste an advertisement ID for now. Later you can replace this with a picker.</p>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Advertisement ID
            <input
              style={styles.input}
              value={adId}
              onChange={(e) => setAdId(e.target.value)}
              placeholder="UUID"
            />
          </label>

          <label style={styles.label}>
            Expected Start (ISO)
            <input
              style={styles.input}
              value={startIso}
              onChange={(e) => setStartIso(e.target.value)}
              placeholder="2026-03-06T10:15:00+02:00"
            />
          </label>

          <label style={styles.label}>
            Expected End (ISO)
            <input
              style={styles.input}
              value={endIso}
              onChange={(e) => setEndIso(e.target.value)}
              placeholder="2026-03-06T10:15:30+02:00"
            />
          </label>

          <label style={styles.label}>
            Duration (ms)
            <input
              style={styles.input}
              type="number"
              min={1}
              value={durationMs}
              onChange={(e) => setDurationMs(Number(e.target.value))}
            />
          </label>
        </div>

        <button type="button" style={styles.primaryBtn} onClick={() => void onCreateItem()}>
          Add Item
        </button>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Schedule Items</h3>

        {items.length === 0 ? (
          <div style={styles.muted}>No items loaded.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Advertisement ID</th>
                  <th style={styles.th}>Start</th>
                  <th style={styles.th}>End</th>
                  <th style={styles.th}>Duration (ms)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} style={styles.tr}>
                    <td style={styles.tdMono}>{it.advertisement_id}</td>
                    <td style={styles.tdMono}>{it.expected_start_time}</td>
                    <td style={styles.tdMono}>{it.expected_end_time}</td>
                    <td style={styles.td}>{it.expected_duration_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.hint}>
          These pages assume the Phase 2 schedule endpoints exist on the backend.
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
  h3: { margin: 0, marginBottom: 12, color: "#0d47a1" },
  sub: { margin: "6px 0 0 0", color: "#555", fontSize: 13 },
  muted: { color: "#666", fontSize: 13, marginTop: 10 },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    marginBottom: 16,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    color: "#444",
    fontWeight: 600,
  },
  input: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d0d7e2",
    outline: "none",
    background: "#fff",
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
  summary: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#fbfcff",
    border: "1px solid #eef2f7",
    fontSize: 13,
    color: "#222",
    display: "grid",
    gap: 8,
    wordBreak: "break-word",
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
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, fontSize: 13, color: "#333" },
  tr: { borderTop: "1px solid #f0f2f5" },
  td: { padding: 10, fontSize: 13, color: "#111" },
  tdMono: { padding: 10, fontSize: 12, color: "#111", fontFamily: "monospace" },
  hint: { marginTop: 12, fontSize: 12, color: "#666" },
};