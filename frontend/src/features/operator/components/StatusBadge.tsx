// frontend/src/features/operator/components/StatusBadge.tsx

import type { CSSProperties } from "react";
import type { DetectionStatus, MonitoringChannelStatus } from "../../../api/types";

type BadgeStatus = MonitoringChannelStatus | DetectionStatus | "active" | "inactive" | "unknown";

type StatusBadgeProps = {
  status: BadgeStatus;
  label?: string;
};

/**
 * Reusable badge for channel health and detection states.
 */
export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const palette = getPalette(status);

  return (
    <span
      style={{
        ...styles.badge,
        background: palette.background,
        color: palette.color,
        borderColor: palette.border,
      }}
    >
      {label ?? status}
    </span>
  );
}

function getPalette(status: BadgeStatus) {
  switch (status) {
    case "online":
    case "matched":
    case "active":
      return {
        background: "#e8f5e9",
        color: "#1b5e20",
        border: "#c8e6c9",
      };

    case "warning":
    case "partial":
    case "unscheduled":
      return {
        background: "#fff8e1",
        color: "#8d6e00",
        border: "#ffe082",
      };

    case "offline":
    case "missed":
    case "inactive":
      return {
        background: "#ffebee",
        color: "#b71c1c",
        border: "#ffcdd2",
      };

    case "unknown":
    default:
      return {
        background: "#f3f6fa",
        color: "#425466",
        border: "#d8e0ea",
      };
  }
}

const styles: Record<string, CSSProperties> = {
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    border: "1px solid transparent",
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
};