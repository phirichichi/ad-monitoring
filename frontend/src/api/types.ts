// frontend/src/api/types.ts

export type UUID = string;

// -----------------------
// Auth / Roles
// -----------------------
export type UserRole = "admin" | "operator" | "client";

// -----------------------
// Channels
// -----------------------
export type Channel = {
  id: UUID;
  name: string;
  slug?: string;
  stream_url?: string;
  timezone?: string;
  is_active?: boolean;
  status?: string;
  health_status?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type CreateChannelRequest = {
  name: string;
  slug?: string;
  stream_url?: string;
  timezone?: string;
};

export type UpdateChannelRequest = {
  name?: string;
  slug?: string;
  stream_url?: string;
  timezone?: string;
  is_active?: boolean;
  status?: string;
  health_status?: Record<string, unknown>;
};

// -----------------------
// Advertisers
// -----------------------
export type Advertiser = {
  id: UUID;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateAdvertiserRequest = {
  name: string;
};

// -----------------------
// Advertisements
// -----------------------
export type Advertisement = {
  id: UUID;
  title: string;
  advertiser_id: UUID;
  created_at?: string;
  updated_at?: string;
};

export type CreateAdvertisementRequest = {
  title: string;
  advertiser_id: UUID;
};

// -----------------------
// Users
// -----------------------
export type User = {
  id: UUID;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CreateUserRequest = {
  email: string;
  password: string;
  role?: UserRole;
};

// -----------------------
// Legacy Playlists (used by current admin pages)
// -----------------------
export type Playlist = {
  id: UUID;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreatePlaylistRequest = {
  name: string;
  description?: string | null;
};

export type UpdatePlaylistRequest = {
  name?: string;
  description?: string | null;
};

// -----------------------
// Phase 2 Playlist Schedules (operator)
// -----------------------
export type PlaylistSource = "automation_import" | "manual" | "api" | "recurring";

export type PlaylistSchedule = {
  id: UUID;
  channel_id: UUID;
  schedule_date: string;
  source: PlaylistSource;
  version: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type CreatePlaylistScheduleRequest = {
  channel_id: UUID;
  schedule_date: string;
  source: PlaylistSource;
  version?: number;
  metadata?: Record<string, unknown>;
};

export type PlaylistItem = {
  id: UUID;
  playlist_schedule_id: UUID;
  channel_id: UUID;
  advertisement_id: UUID;
  expected_start_time: string;
  expected_end_time: string;
  expected_duration_ms: number;
  position_in_break?: number | null;
  break_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreatePlaylistItemRequest = {
  playlist_schedule_id: UUID;
  channel_id: UUID;
  advertisement_id: UUID;
  expected_start_time: string;
  expected_end_time: string;
  expected_duration_ms: number;
  position_in_break?: number | null;
  break_id?: string | null;
};