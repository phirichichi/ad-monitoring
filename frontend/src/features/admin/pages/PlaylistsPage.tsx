import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type { Playlist } from "../../../api/types";

export default function PlaylistsPage() {
  const [items, setItems] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function load() {
    setErr(null);
    try {
      const data = await AdminApi.listPlaylists();
      setItems(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load playlists");
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
      await AdminApi.createPlaylist({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
      });
      setName("");
      setDescription("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create playlist");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this playlist?")) return;
    setLoading(true);
    setErr(null);
    try {
      await AdminApi.deletePlaylist(id);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to delete playlist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Playlists</h2>
          <p style={styles.sub}>Create and list playlists / schedules.</p>
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
            placeholder="Playlist name"
            style={styles.input}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{ ...styles.input, minWidth: 320 }}
          />
          <button
            style={styles.primaryBtn}
            disabled={loading || !canCreate}
            onClick={() => void onCreate()}
          >
            {loading ? "Saving..." : "Create"}
          </button>
        </div>

        {err && <div style={styles.errorBox}>{err}</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.description ?? ""}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12 }}>
                    {p.id}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button style={styles.dangerBtn} onClick={() => void onDelete(p.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan={4} style={{ ...styles.td, opacity: 0.7 }}>
                    No playlists yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.hint}>
          Requires backend endpoints:
          <code> GET /api/v1/playlists</code>, <code> POST /api/v1/playlists</code>,{" "}
          <code>DELETE /api/v1/playlists/&lt;id&gt;</code>.
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
    minWidth: 240,
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
  dangerBtn: {
    background: "#fff5f7",
    color: "#b00020",
    border: "1px solid #f2b8c6",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
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