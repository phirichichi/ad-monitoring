// frontend/src/api/types.ts

export type UUID = string;

// -----------------------
// Channels
// -----------------------
export type Channel = {
  id: UUID;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateChannelRequest = {
  name: string;
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
export type UserRole = "admin" | "operator" | "client_admin" | "client_viewer";

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
// Playlists
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