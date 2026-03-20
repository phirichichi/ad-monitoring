// frontend/src/api/client.ts

type ApiErrorShape = {
  detail?: unknown;
  error?: { message?: unknown };
};

type RefreshResponseShape = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

let refreshPromise: Promise<string | null> | null = null;

function getAccessToken(): string {
  return localStorage.getItem("access_token") || "";
}

function getRefreshToken(): string {
  return localStorage.getItem("refresh_token") || "";
}

function setAccessToken(token: string): void {
  localStorage.setItem("access_token", token);
}

function clearStoredTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

function getAuthHeaders(tokenOverride?: string): HeadersInit {
  const token = tokenOverride ?? getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseJsonSafe(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the API base URL.
 * - Uses VITE_API_BASE_URL when provided
 * - Falls back to same-origin for nginx proxy deployments
 */
function getApiBaseUrl(): string {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  if (envBase) return envBase.replace(/\/+$/, "");

  return window.location.origin;
}

/**
 * Builds headers safely.
 * Important:
 * - Do NOT force Content-Type for FormData uploads
 * - Browser must set multipart/form-data boundary automatically
 */
function buildHeaders(options: RequestInit, tokenOverride?: string): HeadersInit {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  return {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...getAuthHeaders(tokenOverride),
    ...(options.headers || {}),
  };
}

function extractErrorMessage(res: Response, text: string, data: unknown): string {
  let message = `Request failed (${res.status})`;

  if (isRecord(data)) {
    const err = data as ApiErrorShape;

    if (typeof err.detail === "string") {
      message = err.detail;
    } else if (isRecord(err.detail) && typeof err.detail["message"] === "string") {
      message = String(err.detail["message"]);
    } else if (err.error && typeof err.error.message === "string") {
      message = err.error.message;
    }
  }

  if (!isRecord(data) && typeof text === "string" && text.trim().length > 0) {
    message = text;
  }

  return message;
}

async function performFetch(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string,
): Promise<Response> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const headers = buildHeaders(options, tokenOverride);

  return fetch(url, {
    ...options,
    headers,
  });
}

async function requestNewAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  const response = await performFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  const data = parseJsonSafe(text);

  if (!isRecord(data) || typeof data.access_token !== "string") {
    return null;
  }

  const payload = data as RefreshResponseShape;
  setAccessToken(payload.access_token);
  return payload.access_token;
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function redirectToLogin(): void {
  if (window.location.pathname !== "/") {
    window.location.reload();
  } else {
    window.location.reload();
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await performFetch(path, options);
  } catch {
    throw new Error("Failed to fetch (check API server / proxy / network)");
  }

  // Attempt token refresh once on unauthorized.
  if (res.status === 401) {
    const newAccessToken = await refreshAccessTokenOnce();

    if (newAccessToken) {
      try {
        res = await performFetch(path, options, newAccessToken);
      } catch {
        throw new Error("Failed to fetch (check API server / proxy / network)");
      }
    } else {
      clearStoredTokens();
      redirectToLogin();
      throw new Error("Invalid or expired token");
    }
  }

  // Handle empty responses such as DELETE 204
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = parseJsonSafe(text);

  if (!res.ok) {
    const message = extractErrorMessage(res, text, data);

    // If backend still says token invalid after retry, clear tokens.
    if (res.status === 401) {
      clearStoredTokens();
    }

    throw new Error(message);
  }

  return data as T;
}