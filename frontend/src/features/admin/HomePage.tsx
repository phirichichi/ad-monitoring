// frontend/src/features/admin/HomePage.tsx

import { useMemo, useState } from "react";

import AdsPage from "./pages/AdsPage";
import AdvertisersPage from "./pages/AdvertisersPage";
import ChannelsPage from "./pages/ChannelsPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import PlaylistsPage from "./pages/PlaylistsPage";

type UserRole = "admin" | "operator" | "client";
type TokenType = "access" | "refresh";

type JWTPayload = {
  sub: string;
  role: UserRole | string;
  type?: TokenType;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
};

function safeDecodeJwt(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payloadB64 = parts[1];
    if (!payloadB64) return null;

    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");

    // pad base64 (JWT may omit "=" padding)
    const pad = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;

    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);

    if (!parsed || typeof parsed !== "object") return null;

    const p = parsed as Partial<JWTPayload>;
    if (typeof p.sub !== "string") return null;
    if (typeof p.role !== "string") return null;

    return p as JWTPayload;
  } catch {
    return null;
  }
}

type AdminPageKey =
  | "dashboard"
  | "users"
  | "channels"
  | "advertisers"
  | "ads"
  | "playlists"
  | "reports";

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
      onClick={onClick}
      style={{
        ...styles.navBtn,
        ...(active ? styles.navBtnActive : null),
      }}
      type="button"
    >
      {label}
    </button>
  );
}

export default function HomePage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // read once; logout/reload resets
  const access = useMemo(() => localStorage.getItem("access_token") || "", []);
  const refresh = useMemo(() => localStorage.getItem("refresh_token") || "", []);

  const payload = useMemo(() => (access ? safeDecodeJwt(access) : null), [access]);

  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState<AdminPageKey>("dashboard");

  const expText = useMemo(() => {
    const exp = payload?.exp;
    if (!exp || typeof exp !== "number") return "N/A";
    const d = new Date(exp * 1000);
    return d.toLocaleString();
  }, [payload]);

  const roleLabel = payload?.role ?? "N/A";

  const content = (() => {
    switch (page) {
      case "users":
        return <UsersPage />;
      case "channels":
        return <ChannelsPage />;
      case "advertisers":
        return <AdvertisersPage />;
      case "ads":
        return <AdsPage />;
      case "playlists":
        return <PlaylistsPage />;
      case "reports":
        return <ReportsPage />;

      case "dashboard":
      default:
        return (
          <div style={styles.grid}>
            {/* Connection card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Connection</h2>

              <div style={styles.kv}>
                <span style={styles.k}>API Base URL</span>
                <span style={styles.v}>{apiBase}</span>
              </div>

              <div style={styles.kv}>
                <span style={styles.k}>Access Token</span>
                <span style={styles.v}>
                  {access ? (
                    <span style={styles.ok}>Present</span>
                  ) : (
                    <span style={styles.bad}>Missing</span>
                  )}
                </span>
              </div>

              <div style={styles.kv}>
                <span style={styles.k}>Refresh Token</span>
                <span style={styles.v}>
                  {refresh ? (
                    <span style={styles.ok}>Present</span>
                  ) : (
                    <span style={styles.bad}>Missing</span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <button
                  style={styles.primaryBtn}
                  disabled={!access}
                  onClick={async () => {
                    if (!access) return;
                    await navigator.clipboard.writeText(access);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  {copied ? "Copied ✅" : "Copy Access Token"}
                </button>

                <button style={styles.secondaryBtn} onClick={() => window.open(`${apiBase}/docs`, "_blank")}>
                  Open API Docs
                </button>

                <button style={styles.secondaryBtn} onClick={() => window.open(`${apiBase}/health/ready`, "_blank")}>
                  Open Health Check
                </button>
              </div>
            </div>

            {/* Session card */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Session</h2>

              {!payload && (
                <div style={styles.notice}>
                  Could not decode JWT payload. (If your token isn’t a JWT, this is normal.)
                </div>
              )}

              <div style={styles.kv}>
                <span style={styles.k}>User ID (sub)</span>
                <span style={styles.v}>{payload?.sub ?? "N/A"}</span>
              </div>

              <div style={styles.kv}>
                <span style={styles.k}>Role</span>
                <span style={styles.v}>{payload?.role ?? "N/A"}</span>
              </div>

              <div style={styles.kv}>
                <span style={styles.k}>Token Type</span>
                <span style={styles.v}>{payload?.type ?? "N/A"}</span>
              </div>

              <div style={styles.kv}>
                <span style={styles.k}>Expires</span>
                <span style={styles.v}>{expText}</span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={styles.smallLabel}>Raw payload:</div>
                <pre style={styles.pre}>{JSON.stringify(payload ?? {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        );
    }
  })();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>
              Logged in ✅ <span style={styles.rolePill}>{roleLabel}</span>
            </p>
          </div>

          <button
            style={styles.logoutBtn}
            title="Logout (Sign out)"
            onClick={() => {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              window.location.reload();
            }}
          >
            <span style={styles.logoutIcon} aria-hidden>
              ⎋
            </span>
            Logout (Sign out)
          </button>
        </div>

        {/* ADMIN NAV */}
        <div style={styles.navRow}>
          <NavButton active={page === "dashboard"} label="Dashboard" onClick={() => setPage("dashboard")} />
          <NavButton active={page === "users"} label="Users" onClick={() => setPage("users")} />
          <NavButton active={page === "channels"} label="Channels" onClick={() => setPage("channels")} />
          <NavButton active={page === "advertisers"} label="Advertisers" onClick={() => setPage("advertisers")} />
          <NavButton active={page === "ads"} label="Ads" onClick={() => setPage("ads")} />
          <NavButton active={page === "playlists"} label="Playlists" onClick={() => setPage("playlists")} />
          <NavButton active={page === "reports"} label="Reports" onClick={() => setPage("reports")} />
        </div>

        {/* PAGE CONTENT */}
        {content}

        <div style={styles.footer}>
          <span style={{ opacity: 0.8 }}>
            Admin next steps: Users • Channels • Advertisers • Monitoring • Reports
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "#f5f7fb",
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "40px 16px",
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: 1100,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#0d47a1",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#333",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  rolePill: {
    background: "#eaf2ff",
    color: "#0d47a1",
    border: "1px solid #cfe1ff",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  navRow: {
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
    letterSpacing: 0.2,
  },
  logoutIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "#b00020",
    color: "#fff",
    fontSize: 14,
    lineHeight: 1,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    border: "1px solid #eef2f7",
  },
  cardTitle: {
    margin: 0,
    marginBottom: 14,
    fontSize: 16,
    fontWeight: 700,
    color: "#0d47a1",
  },
  kv: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f0f2f5",
  },
  k: { color: "#555", fontSize: 13 },
  v: { color: "#111", fontSize: 13, fontWeight: 600, textAlign: "right", wordBreak: "break-word" },
  ok: { color: "#0a7d2f" },
  bad: { color: "#b00020" },

  notice: {
    background: "#fff7e6",
    border: "1px solid #ffe2a8",
    color: "#7a4b00",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  smallLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  pre: {
    margin: 0,
    background: "#0b1020",
    color: "#d8e0ff",
    padding: 12,
    borderRadius: 10,
    overflowX: "auto",
    fontSize: 12,
    lineHeight: 1.4,
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
  footer: {
    marginTop: 16,
    textAlign: "center",
    color: "#333",
    fontSize: 13,
  },
};