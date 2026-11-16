# Workflow Builder

Chain LLM text steps (clean, summarize, extract, categorize, translate, sentiment) into one pipeline, run it, and see the input, output, time and tokens of every step.

**Live:** https://workflow-builder-umber.vercel.app. Templates run without an account (demo mode, 5 runs per hour per visitor). Sign up to build your own steps, save workflows and keep a run history.

## How it works

- **App and API in one Next.js 16 project on Vercel.** Route handlers under `app/api/*` replace the old Express server.
- **Neon Postgres** (Singapore, free plan) through `@neondatabase/serverless`. Schema: `scripts/schema.sql`.
- **Neon Auth** (managed Better Auth) for email and password login. Sessions are httpOnly cookies, so the API reads the user on the server.
- **Groq** (`llama-4-scout-17b`) runs each step. A step's output becomes the next step's input, and a run stops at the first failing step.
- **Demo mode:** guests can only run seeded templates (steps come from the database, not the client), with input capped at 2,000 characters and 5 runs per hour per salted IP hash. Signed-in users get 30 runs per hour.

| Route | What it does |
| --- | --- |
| `GET /api/health` | Database ping, AI key check, run stats |
| `GET /api/templates` | Public templates |
| `POST /api/workflows` | Run steps (signed in) or a template (anyone) |
| `GET /api/workflows` · `DELETE /api/workflows/clear` | Your run history |
| `GET /api/workflows/:id` | One run (yours, or any demo run) |
| `GET/POST /api/saved-workflows` · `GET/DELETE /api/saved-workflows/:id` | Saved workflows (signed in) |
| `/api/auth/*` | Neon Auth |

## Run locally

```bash
pnpm install
vercel env pull .env.local          # DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, GROQ_API_KEY
node --env-file=.env.local scripts/migrate.mjs   # creates tables and seeds templates (safe to re-run)
pnpm dev
```

Without `GROQ_API_KEY` the app still works for browsing, login and saving; runs show an "AI key needed" notice.

## Environment

| Variable | Source |
| --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Added by the Neon integration on Vercel |
| `NEON_AUTH_BASE_URL` | Added by the Neon integration |
| `NEON_AUTH_COOKIE_SECRET` | Random 32+ character string |
| `GROQ_API_KEY` | console.groq.com |

## History

The first version used Supabase for Postgres and auth, with an Express API on Render (`backend/`, kept for reference). In November 2026 the Supabase project was gone, so I moved the data and auth to Neon and the API into Next.js route handlers on Vercel.
