import { useMemo, useState } from "react";
import ChannelsPage from "./pages/ChannelsPage";
import MonitoringPage from "./pages/MonitoringPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import ReportsPage from "./pages/ReportsPage";

type OperatorTab = "monitoring" | "channels" | "playlists" | "reports";

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
      type="button"
      onClick={onClick}
      style={{
        ...styles.navBtn,
        ...(active ? styles.navBtnActive : null),
      }}
    >
      {label}
    </button>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<OperatorTab>("monitoring");

  const title = useMemo(() => {
    switch (tab) {
      case "channels":
        return "Channels";
      case "playlists":
        return "Playlists";
      case "reports":
        return "Reports";
      case "monitoring":
      default:
        return "Monitoring";
    }
  }, [tab]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Operator Dashboard</h1>
            <div style={styles.subRow}>
              <span style={styles.pill}>operator</span>
              <span style={styles.subtitle}>{title}</span>
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

        <nav style={styles.nav}>
          <NavButton active={tab === "monitoring"} label="Monitoring" onClick={() => setTab("monitoring")} />
          <NavButton active={tab === "channels"} label="Channels" onClick={() => setTab("channels")} />
          <NavButton active={tab === "playlists"} label="Playlists" onClick={() => setTab("playlists")} />
          <NavButton active={tab === "reports"} label="Reports" onClick={() => setTab("reports")} />
        </nav>

        <main style={styles.main}>
          {tab === "monitoring" && <MonitoringPage />}
          {tab === "channels" && <ChannelsPage />}
          {tab === "playlists" && <PlaylistsPage />}
          {tab === "reports" && <ReportsPage />}
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
  nav: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  navBtn: {
    border: "1px solid #d0d7e2",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  navBtnActive: {
    border: "1px solid #1976d2",
    background: "#eaf2ff",
    color: "#0d47a1",
  },
  main: {
    display: "block",
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