import React from "react";

export default function ClientDashboard() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Client Dashboard</h1>
            <div style={styles.subRow}>
              <span style={styles.pill}>client</span>
              <span style={styles.subtitle}>Overview</span>
            </div>
          </div>

          <button
            type="button"
            style={styles.logoutBtn}
            onClick={() => {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              window.location.reload();
            }}
          >
            <span aria-hidden style={styles.logoutIcon}>
              ⎋
            </span>
            Logout
          </button>
        </header>

        <main style={styles.main}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Welcome</h2>
            <p style={styles.text}>
              This is the client dashboard. You can extend this later with:
            </p>
            <ul style={styles.list}>
              <li>Advertiser campaign performance</li>
              <li>Compliance summaries</li>
              <li>Downloaded reports</li>
              <li>Evidence screenshots and clips</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "#f5f7fb",
    display: "flex",
    justifyContent: "center",
    padding: "40px 16px",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: 1100,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },
  h1: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#0d47a1",
  },
  subRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  subtitle: {
    color: "#333",
    fontWeight: 700,
  },
  pill: {
    background: "#eaf2ff",
    border: "1px solid #cfe1ff",
    color: "#0d47a1",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  main: {
    display: "block",
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 20,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    margin: 0,
    marginBottom: 12,
    color: "#0d47a1",
    fontSize: 18,
  },
  text: {
    color: "#333",
    fontSize: 14,
    marginBottom: 12,
  },
  list: {
    color: "#444",
    fontSize: 14,
    paddingLeft: 20,
  },
  logoutBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #f2b8c6",
    background: "#fff5f7",
    color: "#b00020",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
  logoutIcon: {
    display: "inline-flex",
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "#b00020",
    color: "#fff",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
};