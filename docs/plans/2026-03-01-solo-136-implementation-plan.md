# SOLO-136: Configure API Base URL Environment Variables Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate hardcoded relative API paths in the frontend's centralized API client and ensure it routes traffic to the correct backend service.

**Architecture:** Update `lib/api-client.ts` to prepend `process.env.NEXT_PUBLIC_API_URL` to all relative request paths. Configure this variable in `.env.example` and `.env`.

**Tech Stack:** Next.js, TypeScript, fetch API.

---

### Task 1: Update Environment Variables

**Files:**
- Modify: `.env.example`
- Create/Modify: `.env`

**Step 1: Update .env.example**
Add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `.env.example`.

**Step 2: Update/Create .env**
Add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `.env`.

**Step 3: Commit**
```bash
git add .env.example
# Do NOT add .env to git if it's not already tracked (it should be ignored)
git commit -m "infra: add NEXT_PUBLIC_API_URL to environment templates"
```

### Task 2: Update API Client URL Construction

**Files:**
- Modify: `lib/api-client.ts`

**Step 1: Modify apiFetch to use NEXT_PUBLIC_API_URL**

Update `apiFetch` in `lib/api-client.ts` to prepend the base URL.

```typescript
async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  // Construct the target URL
  const targetUrl = url.startsWith('http') 
    ? url 
    : `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

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

  // Use targetUrl instead of url
  const res = await fetch(targetUrl, { ...options, headers });

  if (res.status === 401 && retry && _refreshFn) {
    // Attempt token refresh once
    const newToken = await _refreshFn();
    if (newToken) {
      _accessToken = newToken;
      // Use targetUrl here as well
      return apiFetch<T>(url, options, false);
    }
  }
  // ... rest of the function
}
```

**Step 2: Add logging for verification**
Temporarily add `console.log(`[api-client] Fetching: \${targetUrl}`);` to `apiFetch` to verify URL construction.

**Step 3: Commit**
```bash
git add lib/api-client.ts
git commit -m "infra: prepend NEXT_PUBLIC_API_URL to API requests in api-client"
```

### Task 3: Verification

**Step 1: Verify URL construction**
Since we don't have a full test suite for the frontend, we will verify by checking that the code compiles and the logic is sound.

Run: `pnpm build` (to check for type errors/build issues)

**Step 2: Cleanup logging**
Remove the temporary `console.log` from `lib/api-client.ts`.

**Step 3: Final Commit**
```bash
git add lib/api-client.ts
git commit -m "infra: cleanup verification logs in api-client"
```
