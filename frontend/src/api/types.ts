// frontend/src/api/types.ts

export type UUID = string;

// -----------------------
// Auth / Roles
// -----------------------
export type UserRole = "admin" | "operator" | "client";

// -----------------------
// Channels
// -----------------------
export type ChannelSourceType = "rtmp" | "hls" | "file" | "unknown";

export type Channel = {
  id: UUID;
  name: string;
  slug?: string;
  stream_url?: string;
  timezone?: string;

  // Channel lifecycle / monitoring flags
  is_active?: boolean;
  monitoring_enabled?: boolean;

  // Feed/source metadata
  source_type?: ChannelSourceType | string;

  // Health / status metadata
  status?: string;
  last_seen_at?: string;
  health_status?: Record<string, unknown>;

  created_at?: string;
  updated_at?: string;
};

export type CreateChannelRequest = {
  name: string;
  slug?: string;
  stream_url?: string;
  timezone?: string;
  is_active?: boolean;
  monitoring_enabled?: boolean;
  source_type?: ChannelSourceType | string;
};

export type UpdateChannelRequest = {
  name?: string;
  slug?: string;
  stream_url?: string;
  timezone?: string;
  is_active?: boolean;
  monitoring_enabled?: boolean;
  source_type?: ChannelSourceType | string;
  status?: string;
  last_seen_at?: string;
  health_status?: Record<string, unknown>;
};

// -----------------------
// Consolidated Advertiser Asset Registry
// -----------------------
export type Advertiser = {
  id: UUID;
  name: string;
  video_name: string;
  video_file_name?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateAdvertiserRequest = {
  name: string;
  video_name: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
};

// -----------------------
// Legacy Advertisement types
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
// Playback / Reporting
// -----------------------
export type PlaybackStatus =
  | "matched"
  | "partial"
  | "missed"
  | "unscheduled"
  | "verified"
  | "rejected";

export type PlaybackLog = {
  id: UUID;
  channel_id: UUID;
  channel_name: string;

  // consolidated asset reference
  advertiser_id?: UUID | null;
  advertiser_name: string;
  video_name: string;

  // actual playback timestamps
  played_at: string;
  played_date: string;
  played_time: string;

  // playback metadata
  duration_seconds?: number | null;
  confidence?: number | null;
  status: PlaybackStatus;

  // evidence captured ~3 seconds after detection
  screenshot_path?: string | null;
  screenshot_url?: string | null;
  evidence_available?: boolean;

  created_at?: string;
};

export type PlaybackLogListParams = {
  from_ts: string;
  to_ts: string;
  advertiser_name?: string | null;
  channel_id?: string | null;
  status?: PlaybackStatus | "" | null;
  min_duration_seconds?: number | null;
  max_duration_seconds?: number | null;
};

export type PlaybackReportExportFormat = "pdf" | "xlsx" | "csv";

export type PlaybackReportExportRequest = PlaybackLogListParams & {
  format: PlaybackReportExportFormat;
};

export type PlaybackReportSummary = {
  total_rows: number;
  total_plays: number;
  unique_advertisers: number;
  unique_videos: number;
  unique_channels: number;
  evidence_count: number;
  total_duration_seconds: number;
};

// -----------------------
// Admin Monitoring helpers
// -----------------------
export type AdminMonitoringSnapshot = {
  total_channels: number;
  active_channels: number;
  monitoring_enabled_channels: number;
  detections_in_window: number;
  matched_in_window: number;
  partial_in_window: number;
  missed_in_window: number;
  unscheduled_in_window: number;
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
// Playlist schedule row
// -----------------------
export type ScheduleItem = {
  id: string;
  adName: string;
  videoUrl?: string;
  playTime: string;
  duration: string;
  date: string;
};

// -----------------------
// Playlists
// -----------------------
export type Playlist = {
  id: UUID;
  name: string;
  description?: string | null;
  video_filename?: string | null;
  video_url?: string | null;
  schedule_rows?: ScheduleItem[];
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

export type UpdatePlaylistScheduleRequest = {
  schedule_rows: ScheduleItem[];
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

// -----------------------
// Monitoring (operator live view)
// -----------------------
export type MonitoringChannelStatus = "online" | "offline" | "warning";
export type DetectionStatus = "matched" | "partial" | "missed" | "unscheduled";

export type MonitoringChannel = {
  id: UUID;
  channel_id: UUID;
  channel_name: string;
  stream_status: MonitoringChannelStatus;
  latency_ms: number;
  last_seen_at: string;
  current_program?: string | null;
  current_advertisement?: string | null;
};

export type MonitoringDetection = {
  id: UUID;
  channel_id: UUID;
  channel_name: string;
  advertisement_id?: UUID | null;
  advertisement_name: string;
  detected_at: string;
  confidence: number;
  status: DetectionStatus;
  evidence_url?: string | null;
};

export type MonitoringSummary = {
  total_channels: number;
  online_channels: number;
  detections_today: number;
  partial_count: number;
  missed_count: number;
  unscheduled_count: number;
};