// frontend/src/api/admin.ts

import { apiFetch } from "./client";
import type {
  Channel,
  CreateChannelRequest,
  Advertiser,
  CreateAdvertiserRequest,
  Advertisement,
  CreateAdvertisementRequest,
  User,
  CreateUserRequest,
  Playlist,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  UUID,
} from "./types";

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

  // -----------------------
  // Advertisers
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

  // -----------------------
  // Advertisements
  // -----------------------
  listAds(): Promise<Advertisement[]> {
    return apiFetch<Advertisement[]>("/api/v1/advertisements", { method: "GET" });
  },

  createAd(payload: CreateAdvertisementRequest): Promise<Advertisement> {
    return apiFetch<Advertisement>("/api/v1/advertisements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

  deletePlaylist(id: UUID): Promise<void> {
    return apiFetch<void>(`/api/v1/playlists/${id}`, {
      method: "DELETE",
    });
  },
};