# Dex Frontend

React and TypeScript web client for Dex.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Firebase Web SDK / Authentication
- Lucide React

## Local development

```bash
cd frontend
npm install
```

Create `.env` from `.env.example` and configure the API base URL plus Firebase web-app configuration:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Run:

```bash
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Create production build |
| `npm run typecheck` | Run TypeScript typecheck |
| `npm run preview` | Preview production build |

## Application responsibilities

- Render discovery, search, media details, authentication, profile, and history surfaces.
- Use Firebase client authentication and track session state.
- Send Firebase ID tokens to protected API routes.
- Render TMDB-backed catalogue and detail data returned by the backend.
- Provide loading, empty, validation, success, and error feedback.

## Configuration and security

Only `VITE_*` variables are exposed in browser code. Firebase web configuration is intended for client initialization and does not replace Firebase Security Rules. Never put Firebase Admin credentials, service-account JSON, or the TMDB secret in this directory or any `VITE_*` variable.

## Quality checks

```bash
npm ci
npm run typecheck
npm run build
```

## Deployment

The production frontend is hosted on Vercel:

https://dex-list.vercel.app/

Vercel environment variables must include the production API URL and Firebase client configuration.
