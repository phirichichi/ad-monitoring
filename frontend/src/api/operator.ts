// frontend/src/api/operator.ts

import { apiFetch } from "./client";
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  PlaylistSchedule,
  CreatePlaylistScheduleRequest,
  PlaylistItem,
  CreatePlaylistItemRequest,
  UUID,
  MonitoringChannel,
  MonitoringDetection,
  MonitoringSummary,
} from "./types";

/**
 * Operator-facing API wrapper.
 *
 * Notes:
 * - Keep this file focused on operator workflows only.
 * - Methods here should map closely to backend REST endpoints.
 * - Some methods below are placeholders for future backend support.
 */
export const OperatorApi = {
  // -----------------------
  // Channels
  // -----------------------

  /**
   * Returns all channels available to the operator.
   */
  listChannels(): Promise<Channel[]> {
    return apiFetch<Channel[]>("/api/v1/channels", { method: "GET" });
  },

  /**
   * Creates a new channel.
   */
  createChannel(payload: CreateChannelRequest): Promise<Channel> {
    return apiFetch<Channel>("/api/v1/channels", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Updates an existing channel.
   * Current frontend uses PUT because it replaces/updates channel fields directly.
   */
  updateChannel(id: UUID, payload: UpdateChannelRequest): Promise<Channel> {
    return apiFetch<Channel>(`/api/v1/channels/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Deletes a channel.
   * This requires a matching backend DELETE endpoint.
   */
  deleteChannel(id: UUID): Promise<void> {
    return apiFetch<void>(`/api/v1/channels/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Tests a channel stream.
   * This is intended for future operator "Test Stream" actions.
   * Backend can return any useful test payload, but this is a safe starter shape.
   */
  testChannelStream(id: UUID): Promise<{ status: string; detail?: string }> {
    return apiFetch<{ status: string; detail?: string }>(`/api/v1/channels/${id}/test-stream`, {
      method: "POST",
    });
  },

  /**
   * Toggles monitoring on or off for a channel.
   * This is optional and requires backend support.
   */
  toggleChannelMonitoring(id: UUID, enabled: boolean): Promise<Channel> {
    return apiFetch<Channel>(`/api/v1/channels/${id}/monitoring`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  },

  // -----------------------
  // Phase 2 schedule endpoints
  // -----------------------

  /**
   * Creates a playlist schedule for a channel/date/source.
   */
  createPlaylistSchedule(payload: CreatePlaylistScheduleRequest): Promise<PlaylistSchedule> {
    return apiFetch<PlaylistSchedule>("/api/v1/playlists/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Returns a single playlist schedule by ID.
   */
  getPlaylistSchedule(id: UUID): Promise<PlaylistSchedule> {
    return apiFetch<PlaylistSchedule>(`/api/v1/playlists/schedules/${id}`, {
      method: "GET",
    });
  },

  /**
   * Returns all items attached to a given playlist schedule.
   */
  listPlaylistItems(scheduleId: UUID): Promise<PlaylistItem[]> {
    return apiFetch<PlaylistItem[]>(`/api/v1/playlists/schedules/${scheduleId}/items`, {
      method: "GET",
    });
  },

  /**
   * Creates a new item inside a playlist schedule.
   */
  createPlaylistItem(payload: CreatePlaylistItemRequest): Promise<PlaylistItem> {
    return apiFetch<PlaylistItem>("/api/v1/playlists/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------
  // Monitoring endpoints
  // -----------------------
  // These are optional for now.
  // The monitoring hook can fall back to mock data
  // when these backend routes are not available yet.

  /**
   * Returns per-channel live monitoring health/status.
   */
  listMonitoringChannels(): Promise<MonitoringChannel[]> {
    return apiFetch<MonitoringChannel[]>("/api/v1/monitoring/channels", {
      method: "GET",
    });
  },

  /**
   * Returns recent ad detections for the operator live feed.
   */
  listRecentDetections(): Promise<MonitoringDetection[]> {
    return apiFetch<MonitoringDetection[]>("/api/v1/monitoring/detections/recent", {
      method: "GET",
    });
  },

  /**
   * Returns aggregate monitoring summary counts.
   */
  getMonitoringSummary(): Promise<MonitoringSummary> {
    return apiFetch<MonitoringSummary>("/api/v1/monitoring/summary", {
      method: "GET",
    });
  },
};