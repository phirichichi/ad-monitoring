// frontend/src/features/operator/components/OperatorCard.tsx

import type { CSSProperties, ReactNode } from "react";

type OperatorCardProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  style?: CSSProperties;
};

/**
 * Reusable white card used across operator pages.
 * This removes duplicated border / shadow / padding styles.
 */
export default function OperatorCard({
  children,
  title,
  subtitle,
  rightSlot,
  style,
}: OperatorCardProps) {
  return (
    <section style={{ ...styles.card, ...style }}>
      {(title || subtitle || rightSlot) && (
        <div style={styles.header}>
          <div>
            {title && <h3 style={styles.title}>{title}</h3>}
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>

          {rightSlot ? <div>{rightSlot}</div> : null}
        </div>
      )}

      <div>{children}</div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#0d47a1",
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#555",
    fontSize: 13,
  },
};