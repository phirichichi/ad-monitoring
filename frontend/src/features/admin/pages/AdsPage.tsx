//frontend/src/features/admin/pages/AdsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type { Advertiser } from "../../../api/types";

/**
 * Formats a backend date string safely for table display.
 */
function formatDate(value?: string | null): string {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

export default function AdsPage() {
  const [items, setItems] = useState<Advertiser[]>([]);

  const [name, setName] = useState("");
  const [videoName, setVideoName] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Validates date range only when both dates are present.
   */
  const dateRangeError = useMemo(() => {
    if (!contractStartDate || !contractEndDate) return null;

    const start = new Date(contractStartDate).getTime();
    const end = new Date(contractEndDate).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return "Please provide valid contract dates.";
    }

    if (start > end) {
      return "Contract start date cannot be later than contract end date.";
    }

    return null;
  }, [contractStartDate, contractEndDate]);

  /**
   * Main create validation.
   * Video is optional at creation time, but advertiser name and video name are required.
   */
  const canCreate = useMemo(() => {
    return (
      name.trim().length > 0 &&
      videoName.trim().length > 0 &&
      !dateRangeError &&
      !loading
    );
  }, [name, videoName, dateRangeError, loading]);

  /**
   * Loads all consolidated advertiser-owned ad assets.
   */
  async function load() {
    setErr(null);

    try {
      const data = await AdminApi.listAdvertisers();
      setItems(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load ad assets");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  /**
   * Creates an ad asset record, then uploads the video if selected.
   */
  async function onCreate() {
    if (!canCreate) return;

    setLoading(true);
    setErr(null);
    setSuccess(null);

    try {
      const created = await AdminApi.createAdvertiser({
        name: name.trim(),
        video_name: videoName.trim(),
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
      });

      // Upload video after the asset exists.
      if (videoFile) {
        await AdminApi.uploadAdvertiserVideo(created.id, videoFile);
      }

      // Reset form after success.
      setName("");
      setVideoName("");
      setContractStartDate("");
      setContractEndDate("");
      setVideoFile(null);

      setSuccess("Ad asset created successfully.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create ad asset");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Deletes an asset row.
   */
  async function onDelete(item: Advertiser) {
    const confirmed = window.confirm(
      `Delete "${item.video_name}" for advertiser "${item.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setErr(null);
    setSuccess(null);

    try {
      await AdminApi.deleteAdvertiser(item.id);
      setSuccess(`Deleted asset "${item.video_name}".`);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to delete ad asset");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Ads</h2>
          <p style={styles.sub}>
            Register advertiser-owned ad assets with contract dates and optional video upload.
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
        <h3 style={styles.cardTitle}>Create Ad Asset</h3>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Advertiser Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: MTN Zambia"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Video Name
            <input
              value={videoName}
              onChange={(e) => setVideoName(e.target.value)}
              placeholder="Example: MTN Data Promo April 2026"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Contract Start Date
            <input
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Contract End Date
            <input
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Video File (optional)
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              style={styles.input}
            />
          </label>

          <div style={styles.buttonCell}>
            <button
              style={{ ...styles.primaryBtn, opacity: canCreate ? 1 : 0.65 }}
              disabled={!canCreate}
              onClick={() => void onCreate()}
            >
              {loading ? "Creating..." : "Create Asset"}
            </button>
          </div>
        </div>

        {dateRangeError ? <div style={styles.warningBox}>{dateRangeError}</div> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Registered Ad Assets</h3>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Advertiser Name</th>
                <th style={styles.th}>Video Name</th>
                <th style={styles.th}>Video File</th>
                <th style={styles.th}>Contract Start</th>
                <th style={styles.th}>Contract End</th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={styles.tr}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.video_name}</td>
                  <td style={styles.td}>{item.video_file_name ?? "-"}</td>
                  <td style={styles.td}>{formatDate(item.contract_start_date)}</td>
                  <td style={styles.td}>{formatDate(item.contract_end_date)}</td>
                  <td style={styles.tdMono}>{item.id}</td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      disabled={deletingId === item.id}
                      onClick={() => void onDelete(item)}
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan={7} style={{ ...styles.td, opacity: 0.7 }}>
                    No ad assets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.hint}>
          This page now uses the consolidated advertiser asset backend:
          <code> GET /api/v1/advertisers </code>,
          <code> POST /api/v1/advertisers </code>,
          <code> POST /api/v1/advertisers/:id/video </code>,
          <code> DELETE /api/v1/advertisers/:id </code>.
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
    fontSize: 16,
    fontWeight: 700,
    color: "#0d47a1",
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
  buttonCell: {
    display: "flex",
    alignItems: "flex-end",
  },
  primaryBtn: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
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
  deleteBtn: {
    background: "#fff5f7",
    color: "#b00020",
    border: "1px solid #f2b8c6",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  successBox: {
    background: "#e8f5e9",
    border: "1px solid #c8e6c9",
    padding: 10,
    borderRadius: 10,
    color: "#1b5e20",
    fontSize: 13,
  },
  warningBox: {
    background: "#fff7e6",
    border: "1px solid #ffe2a8",
    padding: 10,
    borderRadius: 10,
    color: "#7a4b00",
    fontSize: 13,
    marginTop: 12,
  },
  errorBox: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    padding: 10,
    borderRadius: 10,
    color: "#7a0000",
    fontSize: 13,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: 10,
    fontSize: 13,
    color: "#333",
  },
  tr: { borderTop: "1px solid #f0f2f5" },
  td: { padding: 10, fontSize: 13, color: "#111", verticalAlign: "top" },
  tdMono: {
    padding: 10,
    fontSize: 12,
    color: "#111",
    fontFamily: "monospace",
    verticalAlign: "top",
  },
  hint: { marginTop: 12, fontSize: 12, color: "#666" },
};