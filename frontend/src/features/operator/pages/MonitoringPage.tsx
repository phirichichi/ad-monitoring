export default function MonitoringPage() {
  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Monitoring</h2>
      <p style={styles.p}>This is the operator monitoring area.</p>

      <div style={styles.note}>
        Planned next:
        <ul style={styles.ul}>
          <li>Live channel status</li>
          <li>Detection feed</li>
          <li>Evidence screenshots</li>
          <li>Matched / partial / missed statuses</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  h2: { margin: 0, color: "#0d47a1" },
  p: { marginTop: 8, color: "#555", fontSize: 13 },
  note: {
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
    border: "1px solid #eef2f7",
    background: "#fbfcff",
    color: "#333",
    fontSize: 13,
  },
  ul: { marginTop: 10 },
};