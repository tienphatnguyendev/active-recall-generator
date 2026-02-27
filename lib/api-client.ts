/**
 * Centralized API client that automatically attaches Authorization headers,
 * handles token refreshing, and normalizes error responses.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

type RefreshFn = () => Promise<string | null>;
let _refreshFn: RefreshFn | null = null;

export function setRefreshFn(fn: RefreshFn) {
  _refreshFn = fn;
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  // Remove Content-Type for FormData so the browser sets the boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && retry && _refreshFn) {
    // Attempt token refresh once
    const newToken = await _refreshFn();
    if (newToken) {
      _accessToken = newToken;
      return apiFetch<T>(url, options, false);
    }
  }

  if (res.status === 429) {
    const err = new ApiError(429, "Too many requests. Please slow down.");
    throw err;
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const message =
      (data as { message?: string })?.message ?? res.statusText;
    throw new ApiError(res.status, message, data);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    apiFetch<T>(url, { ...options, method: "GET" }),

  post: <T>(url: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(url, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(url: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(url: string, options?: RequestInit) =>
    apiFetch<T>(url, { ...options, method: "DELETE" }),
};
