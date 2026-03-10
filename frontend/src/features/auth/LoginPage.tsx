import { useState } from "react";
import { login } from "../../api/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tokens = await login({
        email: email.trim(),
        password,
      });

      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);

      window.location.reload();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Ad Monitoring System</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={onSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="username"
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              style={styles.input}
              placeholder="Enter your password"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #757c87, #1976d2)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: "40px 32px",
    borderRadius: 12,
    width: 380,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
    color: "#0d47a1",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    fontSize: 13,
    marginBottom: 6,
    color: "#333",
  },

  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    outline: "none",
  },

  button: {
    marginTop: 10,
    padding: "12px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#1976d2",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    transition: "0.2s ease",
  },

  error: {
    backgroundColor: "#ffe6e6",
    color: "#b00020",
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
  },
};