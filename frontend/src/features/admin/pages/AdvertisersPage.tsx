import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type { Advertiser } from "../../../api/types";

export default function AdvertisersPage() {
  const [items, setItems] = useState<Advertiser[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function load() {
    setErr(null);
    try {
      setItems(await AdminApi.listAdvertisers());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load advertisers");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate() {
    if (!canCreate) return;
    setLoading(true);
    setErr(null);
    try {
      await AdminApi.createAdvertiser({ name: name.trim() });
      setName("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create advertiser");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Advertisers</h2>
          <p style={styles.sub}>Manage brands/clients who own ads.</p>
        </div>
        <button style={styles.secondaryBtn} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.formRow}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New advertiser name"
            style={styles.input}
          />
          <button
            style={styles.primaryBtn}
            disabled={loading || !canCreate}
            onClick={() => void onCreate()}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>

        {err && <div style={styles.errorBox}>{err}</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} style={styles.tr}>
                  <td style={styles.td}>{a.name}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12 }}>
                    {a.id}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={2} style={{ ...styles.td, opacity: 0.7 }}>
                    No advertisers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.hint}>
          Expected backend: <code>GET /api/v1/advertisers</code> and{" "}
          <code>POST /api/v1/advertisers</code>.
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
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  formRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  input: {
    padding: 10,
    minWidth: 260,
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
    marginBottom: 12,
    color: "#7a0000",
    fontSize: 13,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, fontSize: 13, color: "#333" },
  tr: { borderTop: "1px solid #f0f2f5" },
  td: { padding: 10, fontSize: 13, color: "#111" },
  hint: { marginTop: 12, fontSize: 12, color: "#666" },
};