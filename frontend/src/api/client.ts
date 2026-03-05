// frontend/src/api/client.ts

type ApiErrorShape = {
  detail?: unknown;
  error?: { message?: unknown };
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
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
 * Base URL resolution:
 * - If VITE_API_BASE_URL is set (e.g. local dev), use it.
 * - Otherwise use same-origin (works on LAN via nginx proxy: http://<host>:8080/api/...)
 */
function getApiBaseUrl(): string {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  if (envBase) return envBase.replace(/\/+$/, "");

  // same origin (http://192.168.0.192:8080)
  return window.location.origin;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    // Browser-level "Failed to fetch" (backend down / proxy / network / CORS)
    throw new Error("Failed to fetch (check API server / proxy / network)");
  }

  const text = await res.text();
  const data = parseJsonSafe(text);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;

    if (isRecord(data)) {
      const err = data as ApiErrorShape;

      if (typeof err.detail === "string") message = err.detail;
      else if (isRecord(err.detail) && typeof err.detail["message"] === "string") {
        message = String(err.detail["message"]);
      } else if (err.error && typeof err.error.message === "string") {
        message = err.error.message;
      }
    }

    // If backend returned plain text
    if (!isRecord(data) && typeof text === "string" && text.trim().length > 0) {
      message = text;
    }

    throw new Error(message);
  }

  return data as T;
}