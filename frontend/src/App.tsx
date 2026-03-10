import LoginPage from "./features/auth/LoginPage";
import HomePage from "./features/admin/HomePage";
import OperatorDashboard from "./features/operator/Dashboard";
import ClientDashboard from "./features/client/Dashboard";

type AppRole = "admin" | "operator" | "client";
type TokenType = "access" | "refresh";

type JWTPayload = {
  sub: string;
  role: string;
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
    const pad = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;

    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);

    if (!parsed || typeof parsed !== "object") return null;

    const payload = parsed as Partial<JWTPayload>;
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.role !== "string") return null;

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

function normalizeRole(role: unknown): AppRole | null {
  if (typeof role !== "string") return null;

  const value = role.trim().toLowerCase();

  if (value === "admin") return "admin";
  if (value === "operator") return "operator";
  if (value === "client") return "client";

  return null;
}

export default function App() {
  const accessToken = localStorage.getItem("access_token");

  if (!accessToken) {
    return <LoginPage />;
  }

  const payload = safeDecodeJwt(accessToken);

  if (!payload) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return <LoginPage />;
  }

  const role = normalizeRole(payload.role);

  if (role === "admin") {
    return <HomePage />;
  }

  if (role === "operator") {
    return <OperatorDashboard />;
  }

  if (role === "client") {
    return <ClientDashboard />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef2f7",
          borderRadius: 14,
          padding: 24,
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ marginTop: 0, color: "#b00020", fontSize: 22 }}>
          Unsupported role
        </h1>
        <p style={{ marginBottom: 16, color: "#444" }}>
          Your account logged in, but this frontend does not yet have a dashboard for this role.
        </p>
        <p style={{ marginBottom: 20, color: "#666", fontSize: 13 }}>
          Raw role from token: <b>{payload.role}</b>
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.reload();
          }}
          style={{
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}