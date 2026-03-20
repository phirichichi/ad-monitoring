// frontend/src/api/auth.ts

import { apiFetch } from "./client";

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type RefreshTokenRequest = {
  refresh_token: string;
};

export type RefreshTokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken(
  payload: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  return apiFetch<RefreshTokenResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}