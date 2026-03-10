// frontend/src/api/auth.ts

import { apiFetch } from "./client";

// Login request payload sent to backend.
export type LoginRequest = {
  email: string;
  password: string;
};

// Token response returned by backend after successful login.
export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
};

// Call backend login endpoint and return access/refresh tokens.
export async function login(payload: LoginRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}