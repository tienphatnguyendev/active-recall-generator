# Exposed API Keys in `.env` and `.env.local`

**Date**: 2026-02-28
**Severity**: 🔴 Critical
**Status**: Open — requires immediate key rotation

---

## Problem Description

The `.env` and `.env.local` files contain live API keys and tokens in plaintext. While these files are listed in `.gitignore`, they exist on-disk and could be leaked via:

1. Accidental `git add -f .env`
2. Editor sync / backup tools uploading the file
3. Log output containing env values during debug

**Exposed credentials**:

| File | Key | Service |
|------|-----|---------|
| `.env` | `GROQ_API_KEYS` (3 keys) | Groq LLM API |
| `.env` | `GROQ_API_KEY` | Groq LLM API |
| `.env` | `SAMBANOVA_API_KEYS` (3 keys) | SambaNova AI |
| `.env` | `CEREBRAS_API_KEYS` (3 keys) | Cerebras AI |
| `.env.local` | `VERCEL_OIDC_TOKEN` | Vercel deployment |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` | Supabase (public, OK) |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (public, OK) |
| `.env.local` | `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin (⚠️ despite name, this appears to be the anon key) |

## Impact

- Compromised API keys allow unauthorized usage, billing overruns, and data access
- The `SUPABASE_SERVICE_ROLE_KEY` (if it were actually the service role key) would bypass all RLS policies
- LLM API keys can be used to make unlimited calls at the owner's expense

## Resolution

1. **Immediate**: Rotate ALL exposed API keys on their respective dashboards (Groq, SambaNova, Cerebras, Vercel, Supabase)
2. **Verify**: Confirm `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is actually the anon key (the JWT payload shows `"role":"anon"`) — if so, rename it correctly
3. **Use `.env.example`**: Create a template file with placeholder values:

```env
# .env.example — copy to .env and fill in real values
GROQ_API_KEY=gsk_your_key_here
GROQ_API_KEYS=key1,key2,key3
SAMBANOVA_API_KEYS=key1,key2,key3
CEREBRAS_API_KEYS=key1,key2,key3
```

4. **Add pre-commit hook** to prevent `.env` files from being committed

## Prevention

- Use a secrets manager (e.g., Render's environment variable UI, Vercel's env config) instead of local files
- Add `git-secrets` or a pre-commit hook that scans for API key patterns
- Never store production keys locally — use service-specific env injection
