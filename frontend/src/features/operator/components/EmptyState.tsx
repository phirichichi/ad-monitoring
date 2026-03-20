// frontend/src/features/operator/components/EmptyState.tsx

import type { CSSProperties } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
};

/**
 * Shared empty-state block.
 * Keeps "no data" messages consistent across operator pages.
 */
export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div style={styles.wrap}>
      <div style={styles.icon} aria-hidden>
        ☐
      </div>
      <div style={styles.title}>{title}</div>
      {description ? <div style={styles.description}>{description}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    border: "1px dashed #d7e1ec",
    background: "#fbfcff",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    color: "#4b5563",
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  title: {
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
  },
};