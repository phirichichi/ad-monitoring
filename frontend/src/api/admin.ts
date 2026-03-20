// frontend/src/api/admin.ts

import { apiFetch } from "./client";
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  Advertiser,
  CreateAdvertiserRequest,
  User,
  CreateUserRequest,
  Playlist,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  UpdatePlaylistScheduleRequest,
  UUID,
  PlaybackLog,
  PlaybackLogListParams,
  PlaybackReportExportRequest,
} from "./types";

/**
 * Builds a query string from optional parameters.
 */
function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Produces an ISO time window ending now.
 */
function buildRecentWindow(minutes: number): { from_ts: string; to_ts: string } {
  const to = new Date();
  const from = new Date(to.getTime() - minutes * 60 * 1000);

  return {
    from_ts: from.toISOString(),
    to_ts: to.toISOString(),
  };
}

/**
 * Admin-facing API wrapper.
 *
 * Important change:
 * - Admin asset management now goes through /advertisers only.
 * - Reports are now driven by playback logs, not static asset definitions.
 */
export const AdminApi = {
  // -----------------------
  // Channels
  // -----------------------
  listChannels(): Promise<Channel[]> {
    return apiFetch<Channel[]>("/api/v1/channels", { method: "GET" });
  },

  createChannel(payload: CreateChannelRequest): Promise<Channel> {
    return apiFetch<Channel>("/api/v1/channels", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateChannel(id: UUID, payload: UpdateChannelRequest): Promise<Channel> {
    return apiFetch<Channel>(`/api/v1/channels/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------
  // Consolidated advertiser asset registry
  // -----------------------
  listAdvertisers(): Promise<Advertiser[]> {
    return apiFetch<Advertiser[]>("/api/v1/advertisers", { method: "GET" });
  },

  createAdvertiser(payload: CreateAdvertiserRequest): Promise<Advertiser> {
    return apiFetch<Advertiser>("/api/v1/advertisers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  uploadAdvertiserVideo(id: UUID, file: File): Promise<Advertiser> {
    const formData = new FormData();
    formData.append("video", file);

    return apiFetch<Advertiser>(`/api/v1/advertisers/${id}/video`, {
      method: "POST",
      body: formData,
    });
  },

  deleteAdvertiser(id: UUID): Promise<void> {
    return apiFetch<void>(`/api/v1/advertisers/${id}`, {
      method: "DELETE",
    });
  },

  // -----------------------
  // Playback logs / reporting source of truth
  // -----------------------
  listPlaybackLogs(params: PlaybackLogListParams): Promise<PlaybackLog[]> {
    const query = buildQuery({
      from_ts: params.from_ts,
      to_ts: params.to_ts,
      advertiser_name: params.advertiser_name,
      channel_id: params.channel_id,
      status: params.status,
      min_duration_seconds: params.min_duration_seconds,
      max_duration_seconds: params.max_duration_seconds,
    });

    return apiFetch<PlaybackLog[]>(`/api/v1/reports/playback-logs${query}`, {
      method: "GET",
    });
  },

  /**
   * Convenience helper for recent detections shown in the admin monitoring UI.
   */
  listRecentPlaybackLogs(minutes = 15, channelId?: UUID | null): Promise<PlaybackLog[]> {
    const window = buildRecentWindow(minutes);

    return this.listPlaybackLogs({
      ...window,
      channel_id: channelId || null,
      advertiser_name: null,
      status: null,
      min_duration_seconds: null,
      max_duration_seconds: null,
    });
  },

  /**
   * Downloads an exported report built from playback logs.
   */
  async exportPlaybackReport(payload: PlaybackReportExportRequest): Promise<Blob> {
    const base = `${window.location.origin}`;
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || base;
    const token = localStorage.getItem("access_token") || "";

    const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/v1/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }

    return res.blob();
  },

  // -----------------------
  // Users
  // -----------------------
  listUsers(): Promise<User[]> {
    return apiFetch<User[]>("/api/v1/users", { method: "GET" });
  },

  createUser(payload: CreateUserRequest): Promise<User> {
    return apiFetch<User>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------
  // Playlists
  // -----------------------
  listPlaylists(): Promise<Playlist[]> {
    return apiFetch<Playlist[]>("/api/v1/playlists", { method: "GET" });
  },

  getPlaylist(id: UUID, date?: string): Promise<Playlist> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return apiFetch<Playlist>(`/api/v1/playlists/${id}${query}`, { method: "GET" });
  },

  createPlaylist(payload: CreatePlaylistRequest): Promise<Playlist> {
    return apiFetch<Playlist>("/api/v1/playlists", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePlaylist(id: UUID, payload: UpdatePlaylistRequest): Promise<Playlist> {
    return apiFetch<Playlist>(`/api/v1/playlists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updatePlaylistSchedule(id: UUID, payload: UpdatePlaylistScheduleRequest): Promise<Playlist> {
    return apiFetch<Playlist>(`/api/v1/playlists/${id}/schedule`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  uploadPlaylistVideo(id: UUID, file: File): Promise<Playlist> {
    const formData = new FormData();
    formData.append("video", file);

    return apiFetch<Playlist>(`/api/v1/playlists/${id}/video`, {
      method: "POST",
      body: formData,
    });
  },

  deletePlaylist(id: UUID): Promise<void> {
    return apiFetch<void>(`/api/v1/playlists/${id}`, {
      method: "DELETE",
    });
  },
};