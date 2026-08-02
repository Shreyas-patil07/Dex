# Dex

> *Your watch history. Your identity.*

A Steam-style profile platform for movie, series, and anime watchers. Log everything. Get taste-powered recommendations. Own your identity.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shreyas-patil07/dex&root=frontend)

---

## Pages

| Route | Description |
|---|---|
| `/` | Home — landing page, feature overview |
| `/discover` | Recommendations — taste-matched picks with match score |
| `/list` | My List — full watch history with filters, search, grid/table view |
| `/profile` | Profile — bento grid, badges, taste breakdown (coming soon) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS + CSS Custom Properties |
| Icons | Lucide React |
| Animation | Framer Motion |
| Charts | Recharts |
| Hosting | Vercel (Hobby — free) |
| Backend (planned) | FastAPI on Render |
| Database (planned) | Supabase (PostgreSQL + pgvector) |
| Catalog data | TMDB API + Jikan API |

---

## Project Structure

```
Dex/
├── vercel.json                  ← Vercel config (rootDirectory: frontend)
├── Dex_Blueprint.md             ← Full product spec
├── dex-theme-style-guide.md     ← Design system reference
└── frontend/                    ← Next.js app
    ├── app/
    │   ├── globals.css          ← Design tokens, glassmorphism, animations
    │   ├── layout.tsx           ← Root layout + Navbar
    │   ├── page.tsx             ← Home
    │   ├── discover/page.tsx    ← Discover
    │   ├── list/page.tsx        ← List
    │   └── profile/page.tsx     ← Profile
    ├── components/
    │   └── nav/Navbar.tsx       ← Sidebar (desktop) + bottom nav (mobile)
    └── lib/
        └── mock-data.ts         ← Static fixture data (12 titles, 6 recs, 8 badges)
```

---

## Local Development

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

### Option 1 — One-click (recommended)

Click the **Deploy with Vercel** button above. Vercel automatically detects the `rootDirectory: frontend` from `vercel.json`.

### Option 2 — Vercel CLI

```bash
npm i -g vercel
vercel --cwd frontend
```

### Option 3 — Vercel Dashboard

1. Import `https://github.com/Shreyas-patil07/dex`
2. Set **Root Directory** → `frontend`
3. Framework preset → **Next.js** (auto-detected)
4. Click **Deploy**

No environment variables needed for the current frontend-only build.

---

## Design System

Full design specification lives in [`dex-theme-style-guide.md`](./dex-theme-style-guide.md).

Key tokens:
- **Background**: `#0D1117` (Cinema Black)
- **Accent**: `#7C3AED` (Royal Purple) + `#2DD4BF` (Teal) + `#F59E0B` (Gold)
- **Font**: Inter (400–900)
- **Style**: Dark mode + Glassmorphism + Bento Grid

---

## Roadmap

See [`Dex_Blueprint.md`](./Dex_Blueprint.md) for the full phased roadmap.

| Phase | Status |
|---|---|
| Frontend (4 pages) | ✅ Complete |
| Auth (Supabase) | 🔜 Next |
| Catalog ingestion (TMDB) | 🔜 Next |
| Taste engine (pgvector) | 📋 Planned |
| Recommendations | 📋 Planned |
| Badges + Leaderboards | 📋 Planned |
