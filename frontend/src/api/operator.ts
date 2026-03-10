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
} from "./types";

export const OperatorApi = {
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
  // Phase 2 schedule endpoints
  // -----------------------
  createPlaylistSchedule(payload: CreatePlaylistScheduleRequest): Promise<PlaylistSchedule> {
    return apiFetch<PlaylistSchedule>("/api/v1/playlists/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getPlaylistSchedule(id: UUID): Promise<PlaylistSchedule> {
    return apiFetch<PlaylistSchedule>(`/api/v1/playlists/schedules/${id}`, {
      method: "GET",
    });
  },

  listPlaylistItems(scheduleId: UUID): Promise<PlaylistItem[]> {
    return apiFetch<PlaylistItem[]>(`/api/v1/playlists/schedules/${scheduleId}/items`, {
      method: "GET",
    });
  },

  createPlaylistItem(payload: CreatePlaylistItemRequest): Promise<PlaylistItem> {
    return apiFetch<PlaylistItem>("/api/v1/playlists/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};