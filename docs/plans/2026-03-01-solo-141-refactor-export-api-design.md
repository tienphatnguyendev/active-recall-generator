# Design: SOLO-141 Refactor Export Buttons to Use Centralized API Client

## Overview
Refactor the export functionality in the frontend to use the centralized `api-client.ts`. This ensures that exports include proper authentication headers, follow the same error handling patterns as other API calls, and support token refresh logic.

## Goal
- Replace raw `fetch()` calls in export components with `api-client.ts`.
- Extend `api-client.ts` to support fetching binary data (blobs).
- Ensure consistent error handling and authentication for export operations.

## Proposed Changes

### 1. Extend `api-client.ts`
Add a `blob` method to the `api` object to handle binary responses.

```typescript
// lib/api-client.ts

// Internal helper for blob responses
async function apiFetchBlob(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<Blob> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const targetUrl = url.startsWith('http') 
    ? url 
    : `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const accessToken = getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(targetUrl, { ...options, headers });

  if (res.status === 401 && retry && _refreshFn) {
    const newToken = await _refreshFn();
    if (newToken) {
      setAccessToken(newToken);
      return apiFetchBlob(url, options, false);
    }
  }

  if (res.status === 429) {
    throw new ApiError(429, "Too many requests. Please slow down.");
  }

  if (!res.ok) {
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const message = data?.message ?? res.statusText;
    throw new ApiError(res.status, message, data);
  }

  return res.blob();
}

export const api = {
  // ... existing methods
  blob: (url: string, options?: RequestInit) =>
    apiFetchBlob(url, { ...options, method: "GET" }),
};
```

### 2. Refactor `components/artifacts/export-button.tsx`
Update `handleExport` to use `api.blob(endpoint)`.

```typescript
// components/artifacts/export-button.tsx
const handleExport = async (format: ExportFormat) => {
  setLoading(format);
  setError(null);
  setIsOpen(false);

  try {
    const endpoint = artifactId
      ? `/api/artifacts/${artifactId}/export?format=${format}`
      : `/api/artifacts/export?format=${format}`;

    const blob = await api.blob(endpoint);
    const url = URL.createObjectURL(blob);
    // ... download logic
  } catch (err) {
    if (err instanceof ApiError) {
      setError(err.message);
    } else {
      setError("Export failed. Please try again.");
    }
  } finally {
    setLoading(null);
  }
};
```

### 3. Refactor `components/analytics/analytics-export-button.tsx`
Update `handleExport` to use `api.blob`.

```typescript
// components/analytics/analytics-export-button.tsx
const handleExport = async (format: AnalyticsExportFormat) => {
  setLoading(format);
  setError(null);

  try {
    const blob = await api.blob(`/api/artifacts/export?format=${format}`);
    const url = URL.createObjectURL(blob);
    // ... download logic
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Export failed.");
  } finally {
    setLoading(null);
  }
};
```

## Verification Plan

### Manual Verification
1.  **Export Single Artifact**: Click "Export" on an individual artifact and verify that the file downloads correctly.
2.  **Export All Artifacts**: Click "Export" on the main artifacts list and verify that the bulk export downloads correctly.
3.  **Analytics Export**: Export analytics data and verify the download.
4.  **Network Inspection**: Open the browser's developer tools and verify that the export requests include the `Authorization` header.
5.  **Error Handling**: Temporarily invalidate the token or block the request to verify that the error message is displayed correctly.

### Automated Verification
- Run `pnpm run build` to ensure no type errors or build breakages were introduced.
