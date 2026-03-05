import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type { Advertisement, Advertiser } from "../../../api/types";

export default function AdsPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [title, setTitle] = useState("");
  const [advertiserId, setAdvertiserId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => title.trim().length > 0 && advertiserId.length > 0, [title, advertiserId]);

  async function load() {
    setErr(null);
    try {
      const [adsData, advData] = await Promise.all([AdminApi.listAds(), AdminApi.listAdvertisers()]);
      setAds(adsData);
      setAdvertisers(advData);
      if (!advertiserId && advData.length) setAdvertiserId(advData[0].id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load ads");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!canCreate) return;
    setLoading(true);
    setErr(null);
    try {
      await AdminApi.createAd({ title: title.trim(), advertiser_id: advertiserId });
      setTitle("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create ad");
    } finally {
      setLoading(false);
    }
  }

  const advertiserNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of advertisers) m.set(a.id, a.name);
    return m;
  }, [advertisers]);

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Ads</h2>
          <p style={styles.sub}>Create ads and attach them to an advertiser.</p>
        </div>
        <button style={styles.secondaryBtn} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.formRow}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ad title"
            style={styles.input}
          />

          <select
            value={advertiserId}
            onChange={(e) => setAdvertiserId(e.target.value)}
            style={styles.select}
          >
            {!advertisers.length && <option value="">No advertisers yet</option>}
            {advertisers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <button style={styles.primaryBtn} disabled={loading || !canCreate} onClick={() => void onCreate()}>
            {loading ? "Creating..." : "Create"}
          </button>
        </div>

        {err && <div style={styles.errorBox}>{err}</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Advertiser</th>
                <th style={styles.th}>ID</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} style={styles.tr}>
                  <td style={styles.td}>{ad.title}</td>
                  <td style={styles.td}>{advertiserNameById.get(ad.advertiser_id) ?? ad.advertiser_id}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12 }}>{ad.id}</td>
                </tr>
              ))}
              {!ads.length && (
                <tr>
                  <td colSpan={3} style={{ ...styles.td, opacity: 0.7 }}>
                    No ads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.hint}>
          Expected backend: <code>GET /api/v1/advertisements</code> and <code>POST /api/v1/advertisements</code>.
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
  select: {
    padding: 10,
    minWidth: 240,
    borderRadius: 10,
    border: "1px solid #d0d7e2",
    background: "#fff",
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