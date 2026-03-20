// frontend/src/features/operator/components/OperatorSectionHeader.tsx

import type { CSSProperties, ReactNode } from "react";

type OperatorSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

/**
 * Shared page header for operator pages.
 * Keeps page titles visually consistent.
 */
export default function OperatorSectionHeader({
  title,
  subtitle,
  action,
}: OperatorSectionHeaderProps) {
  return (
    <div style={styles.wrap}>
      <div>
        <h2 style={styles.title}>{title}</h2>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  title: {
    margin: 0,
    color: "#0d47a1",
    fontSize: 24,
    fontWeight: 700,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#555",
    fontSize: 13,
  },
};