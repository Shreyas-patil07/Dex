# Dex Frontend

React and TypeScript browser client for Dex.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Firebase Web SDK/Authentication, and Lucide React.

## Local development

```bash
cd frontend
npm install
```

Create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Start with `npm run dev`.

## Scripts

| Command | Purpose |
|---|---|
| npm run dev | Vite dev server |
| npm run build | Production bundle |
| npm run typecheck | TypeScript check |
| npm run preview | Preview production build |

## Responsibilities

Render trending discovery (day/week and movie/series filters), search, media details, authentication, profile and watch history. Signed-in users get Safe, Adjacent and Wildcard For You recommendations, a one-page-at-a-time historical taste backfill action, and a read-only Taste DNA profile showing positive, lower-rated and recent signals with profile coverage. Media detail pages show credits/videos, India watch-provider availability and the signed-in user's existing watch status before offering Watched, Watching, Want to watch or In future actions. The profile supports paginated watch history, status changes, Google/email-password provider linking, password reset and sign-out. Maintain Firebase client session state and send Firebase ID tokens to protected API routes.

## Configuration and security

Only VITE_* variables are exposed to browser code. Firebase web configuration is client-side and does not replace Firebase Security Rules. Never place Firebase Admin credentials, service-account JSON, or TMDB secret in this directory or any VITE_* variable.

## Quality checks

```bash
npm ci
npm run typecheck
npm run build
```

## Deployment

Production frontend: https://dex-list.vercel.app/

The frontend currently expects the backend to expose `GET /api/recommendations`, `POST /api/taste/backfill`, and `GET /api/watches/{watch_id}` in addition to watch CRUD. See [API contract](../docs/06_Protocol_and_Data_Schema.md) and [deployment runbook](../docs/12_Deployment_Runbook.md).

Configure the production API URL and Firebase client configuration in Vercel environment variables.
