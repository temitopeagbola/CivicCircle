# CivicCircle — build plan

Residents report local problems (potholes, broken lights, fly-tipping…) with a photo,
a pin and a description. AI files each report: it picks a category, suggests a severity,
writes a one-line summary and flags likely duplicates nearby. Neighbours upvote and
comment. Moderators move reports through a status workflow.

## Architecture

```
apps/web     Expo (React Native + Expo Router). Ships to iOS/Android and as a static
             web export on Netlify. Uses Firebase Auth on the client only for sign-in;
             every read/write goes through the API.
apps/api     Node.js + Express + TypeScript. Verifies Firebase ID tokens, owns all
             Firestore/Storage access via firebase-admin, calls OpenAI, enforces rate
             limits and the monthly AI budget. Hosted on Render (free web service).
packages/shared   Zod schemas, enums and DTO types shared by web and api.
firebase/    Firestore + Storage rules (deny-all to clients), Firestore indexes.
e2e/         Playwright smoke test that runs against the Firebase emulators.
```

### Why the API is the only data path

- Firestore/Storage rules are deny-all, so the attack surface is one service with
  validation, rate limiting and role checks in plain TypeScript (easy to unit test),
  not rules files.
- OpenAI calls and spend accounting must be server-side anyway.
- The client stays dumb: one typed fetch wrapper, React Query for caching.

### Data model (Firestore)

| Path | Fields |
| --- | --- |
| `users/{uid}` | displayName, role (`resident`/`moderator`), createdAt |
| `reports/{id}` | author, description, photo {url,path}, location {lat,lng}, geohash, category, severity, summary, ai {provider, model, …}, embedding + embeddingModel, duplicates[], status, statusHistory[], upvoteCount, commentCount, timestamps |
| `reports/{id}/comments/{id}` | author, body, createdAt |
| `reports/{id}/upvotes/{uid}` | createdAt (doc existence = vote; counter kept in a transaction) |
| `aiUsage/{YYYY-MM}` | spentUsd, calls, updatedAt |

Nearby queries use geohash ranges (`geofire-common`) and then exact haversine filtering.

### AI pipeline (on report create)

1. Photo normalised with `sharp`: auto-rotate, max 1600px, re-encoded JPEG, EXIF/GPS stripped.
2. Moderation of text + image (OpenAI moderation endpoint is free; mock uses a word list).
3. Classification: one structured-output chat call → category, severity, one-line summary.
4. Embedding of summary + description (`text-embedding-3-small`, 256 dims).
5. Duplicate detection: candidates within 250 m in the last 30 days that are still active;
   score = cosine similarity + distance decay + category match. Embeddings from different
   models are never compared; the deterministic local embedding is used as a common fallback.

Providers live behind an `AiProvider` interface: `openai` or `mock` (keyword classifier +
hashed bag-of-words embeddings), chosen by `AI_PROVIDER` (`auto` = OpenAI when a key is set).

### Cost and abuse controls

- **Monthly spend cap**: before every paid call the API atomically reserves an upper-bound
  cost estimate in `aiUsage/{month}` (Firestore transaction) and refuses if it would exceed
  `OPENAI_MONTHLY_BUDGET_USD`; after the call it settles to the real cost from the usage
  block. Over budget → the report is still created using the heuristic provider.
- **Per-IP rate limits** (`express-rate-limit`): global, report creation, comments, demo login.
  `TRUST_PROXY` is configurable so X-Forwarded-For can't be spoofed past Render's proxy.
- Upload limits: 1 photo, ≤ 6 MB, must decode as JPEG/PNG/WebP.

### Hosting

- Web: Netlify (existing site), `expo export --platform web`, SPA fallback.
- API: Render free web service from `render.yaml` (Docker). Sleeps when idle → the app
  shows a "waking the server…" banner when a request is slow.
- Firebase: Auth, Firestore, Storage on one project. Locally and in CI: Firebase Emulator Suite
  (`demo-civiccircle` project, no credentials needed).

### Testing

- API unit tests: classifier, embeddings, duplicate scoring, budget guard, pricing, status rules.
- API integration tests: supertest against `createApp()` with the in-memory store and a fake
  token verifier (validation, auth/roles, upvote toggle, comments, rate limit 429).
- Store contract tests: same suite against the memory store and the Firestore emulator.
- Web unit tests for pure helpers.
- Playwright e2e: demo login → feed → create report with photo → AI result → upvote → comment.

## Milestones

1. Scaffold workspaces + shared schemas.
2. API core (stores, AI, budget, duplicates) with tests.
3. API routes + seed script.
4. Expo app screens.
5. Docker compose, Render, Netlify, CI.
6. E2E, README, PR.
