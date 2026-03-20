// frontend/src/features/operator/hooks/useMonitoringFeed.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorApi } from "../../../api/operator";
import type {
  MonitoringChannel,
  MonitoringDetection,
  MonitoringSummary,
} from "../../../api/types";

type UseMonitoringFeedResult = {
  loading: boolean;
  error: string | null;
  channels: MonitoringChannel[];
  detections: MonitoringDetection[];
  summary: MonitoringSummary;
  refresh: () => Promise<void>;
};

/**
 * Default empty summary used before data loads.
 */
const EMPTY_SUMMARY: MonitoringSummary = {
  total_channels: 0,
  online_channels: 0,
  detections_today: 0,
  partial_count: 0,
  missed_count: 0,
  unscheduled_count: 0,
};

/**
 * Generates mock channel status data.
 * This is used when backend monitoring endpoints are not ready yet.
 */
function buildMockChannels(): MonitoringChannel[] {
  const now = new Date().toISOString();

  return [
    {
      id: "mch-1",
      channel_id: "channel-1",
      channel_name: "ZNBC 1",
      stream_status: "online",
      latency_ms: 1100,
      last_seen_at: now,
      current_program: "Morning Show",
      current_advertisement: "Coca-Cola 30s",
    },
    {
      id: "mch-2",
      channel_id: "channel-2",
      channel_name: "Muvi TV",
      stream_status: "warning",
      latency_ms: 2700,
      last_seen_at: now,
      current_program: "News Bulletin",
      current_advertisement: "Airtel Data Promo",
    },
    {
      id: "mch-3",
      channel_id: "channel-3",
      channel_name: "Prime TV",
      stream_status: "offline",
      latency_ms: 0,
      last_seen_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      current_program: null,
      current_advertisement: null,
    },
  ];
}

/**
 * Generates mock recent detections.
 * This keeps the monitoring page useful even before backend integration exists.
 */
function buildMockDetections(): MonitoringDetection[] {
  const now = Date.now();

  return [
    {
      id: "det-1",
      channel_id: "channel-1",
      channel_name: "ZNBC 1",
      advertisement_id: "ad-1",
      advertisement_name: "Coca-Cola 30s",
      detected_at: new Date(now - 45 * 1000).toISOString(),
      confidence: 98.4,
      status: "matched",
      evidence_url: "",
    },
    {
      id: "det-2",
      channel_id: "channel-2",
      channel_name: "Muvi TV",
      advertisement_id: "ad-2",
      advertisement_name: "Airtel Data Promo",
      detected_at: new Date(now - 2 * 60 * 1000).toISOString(),
      confidence: 73.2,
      status: "partial",
      evidence_url: "",
    },
    {
      id: "det-3",
      channel_id: "channel-1",
      channel_name: "ZNBC 1",
      advertisement_id: null,
      advertisement_name: "Unknown / Unscheduled Segment",
      detected_at: new Date(now - 4 * 60 * 1000).toISOString(),
      confidence: 64.1,
      status: "unscheduled",
      evidence_url: "",
    },
    {
      id: "det-4",
      channel_id: "channel-3",
      channel_name: "Prime TV",
      advertisement_id: "ad-9",
      advertisement_name: "Shoprite Weekend Deal",
      detected_at: new Date(now - 7 * 60 * 1000).toISOString(),
      confidence: 0,
      status: "missed",
      evidence_url: "",
    },
  ];
}

/**
 * Builds summary counts from live data.
 */
function buildSummary(
  channels: MonitoringChannel[],
  detections: MonitoringDetection[],
): MonitoringSummary {
  return {
    total_channels: channels.length,
    online_channels: channels.filter((item) => item.stream_status === "online").length,
    detections_today: detections.length,
    partial_count: detections.filter((item) => item.status === "partial").length,
    missed_count: detections.filter((item) => item.status === "missed").length,
    unscheduled_count: detections.filter((item) => item.status === "unscheduled").length,
  };
}

/**
 * Formats backend or runtime errors safely.
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load monitoring data";
}

/**
 * Live monitoring hook.
 *
 * Behavior:
 * - tries real monitoring endpoints first
 * - falls back to mock data if endpoints do not exist yet
 * - polls every 15 seconds
 */
export function useMonitoringFeed(): UseMonitoringFeedResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<MonitoringChannel[]>([]);
  const [detections, setDetections] = useState<MonitoringDetection[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary>(EMPTY_SUMMARY);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const [liveChannels, liveDetections, liveSummary] = await Promise.all([
        OperatorApi.listMonitoringChannels(),
        OperatorApi.listRecentDetections(),
        OperatorApi.getMonitoringSummary(),
      ]);

      setChannels(liveChannels);
      setDetections(liveDetections);
      setSummary(liveSummary);
    } catch (apiError) {
      const mockChannels = buildMockChannels();
      const mockDetections = buildMockDetections();

      setChannels(mockChannels);
      setDetections(mockDetections);
      setSummary(buildSummary(mockChannels, mockDetections));

      setError(`${toErrorMessage(apiError)}. Showing local mock monitoring data.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refresh]);

  return useMemo(
    () => ({
      loading,
      error,
      channels,
      detections,
      summary,
      refresh,
    }),
    [loading, error, channels, detections, summary, refresh],
  );
}