import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../api/admin";
import type { CreateUserRequest, User, UserRole } from "../../../api/types";

const ROLES: UserRole[] = ["admin", "operator", "client_admin", "client_viewer"];

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("client_viewer");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => email.trim().includes("@") && password.length >= 6, [email, password]);

  async function load() {
    setErr(null);
    try {
      setItems(await AdminApi.listUsers());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load users");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate() {
    if (!canCreate) return;
    setLoading(true);
    setErr(null);

    const payload: CreateUserRequest = {
      email: email.trim(),
      password,
      role,
    };

    try {
      await AdminApi.createUser(payload);
      setEmail("");
      setPassword("");
      setRole("client_viewer");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Users</h2>
          <p style={styles.sub}>Create accounts and assign roles.</p>
        </div>
        <button style={styles.secondaryBtn} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} placeholder="user@example.com" />
          </label>

          <label style={styles.label}>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} type="password" placeholder="min 6 chars" />
          </label>

          <label style={styles.label}>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={styles.select}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button style={styles.primaryBtn} disabled={loading || !canCreate} onClick={() => void onCreate()}>
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>

        {err && <div style={styles.errorBox}>{err}</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Active</th>
                <th style={styles.th}>ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{u.role}</td>
                  <td style={styles.td}>{u.is_active ? "Yes" : "No"}</td>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12 }}>{u.id}</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={4} style={{ ...styles.td, opacity: 0.7 }}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.hint}>
          Expected backend: <code>GET /api/v1/users</code> and <code>POST /api/v1/users</code>.
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
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: "#444", display: "grid", gap: 6 },
  input: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d0d7e2",
    outline: "none",
  },
  select: {
    padding: 10,
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