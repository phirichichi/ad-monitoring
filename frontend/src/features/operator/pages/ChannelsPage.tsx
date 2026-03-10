import { useEffect, useMemo, useState } from "react";
import { OperatorApi } from "../../../api/operator";
import type { Channel } from "../../../api/types";

type FormState = {
  name: string;
  slug: string;
  stream_url: string;
  timezone: string;
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function ChannelsPage() {
  const [items, setItems] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    stream_url: "",
    timezone: "UTC",
  });

  const canSubmit = useMemo(() => {
    return form.name.trim().length > 0;
  }, [form]);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await OperatorApi.listChannels();
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate() {
    setErr(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() ? normalizeSlug(form.slug) : undefined,
        stream_url: form.stream_url.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
      };

      await OperatorApi.createChannel(payload);
      setForm({
        name: "",
        slug: "",
        stream_url: "",
        timezone: "UTC",
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Channels</h2>
          <p style={styles.sub}>Create and review channels. Extra fields are ready for your future backend.</p>
        </div>

        <button style={styles.secondaryBtn} onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Create Channel</h3>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Name
            <input
              style={styles.input}
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

          <label style={styles.label}>
            Slug
            <input
              style={styles.input}
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="znbc-1"
            />
          </label>

          <label style={styles.label}>
            Stream URL
            <input
              style={styles.input}
              value={form.stream_url}
              onChange={(e) => setForm((prev) => ({ ...prev, stream_url: e.target.value }))}
              placeholder="rtmp://... or file:///videos/sample.mp4"
            />
          </label>

          <label style={styles.label}>
            Timezone
            <input
              style={styles.input}
              value={form.timezone}
              onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
              placeholder="UTC"
            />
          </label>
        </div>

        <button
          type="button"
          style={{ ...styles.primaryBtn, opacity: canSubmit ? 1 : 0.6 }}
          disabled={!canSubmit}
          onClick={() => void onCreate()}
        >
          Create
        </button>

        {err && <div style={styles.errorBox}>{err}</div>}
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>All Channels</h3>

        {loading ? (
          <div style={styles.muted}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={styles.muted}>No channels found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Slug</th>
                  <th style={styles.th}>Timezone</th>
                  <th style={styles.th}>Active</th>
                  <th style={styles.th}>ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ch) => (
                  <tr key={ch.id} style={styles.tr}>
                    <td style={styles.td}>{ch.name}</td>
                    <td style={styles.tdMono}>{ch.slug ?? "-"}</td>
                    <td style={styles.td}>{ch.timezone ?? "-"}</td>
                    <td style={styles.td}>
                      {typeof ch.is_active === "boolean" ? (ch.is_active ? "Yes" : "No") : "-"}
                    </td>
                    <td style={styles.tdMono}>{ch.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.hint}>
          Current backend only requires <code>name</code>. The other form fields are future-safe.
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
  muted: { color: "#666", fontSize: 13 },
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
  errorBox: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
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