# Dex — Complete Theme & Style Guide

> *A Steam-style profile platform for movie, series, and anime watchers.*
> Version 1.0 | June 2026

---

## 1. Brand Identity

### Name
**Dex** — Short for *Index*. A personal index of everything you've ever watched.

### Tagline
> *Your watch history. Your identity.*

### Brand Personality
- Minimal but expressive
- Premium but personal
- Data-forward but emotionally warm
- Built for night owls and binge watchers

### Core Design Principle
> **Make the profile feel like a personal cinema room, not a spreadsheet.**

Every design decision must pass this test.

---

## 2. Psychology Foundation

Dex is built on 6 psychological principles that drive retention and engagement:

| Principle | Implementation |
|---|---|
| **Endowment Effect** | The more a user logs, the more the data feels like *theirs*. Logging = ownership. |
| **Status & Prestige** | Public profiles, hours watched counters, rare badges = bragging rights. |
| **Variable Reward** | Badge unlocks, friend activity, ratings — small dopamine hits that pull users back. |
| **Completion Anxiety** | Watchlists create psychological debt. "Plan to Watch" is the stickiest feature. |
| **Social Mirror** | Friend feeds create comparison and curiosity — the core engagement loop. |
| **Nostalgia Anchoring** | Logging old favourites turns Dex into a memory diary, not just a tracker. |

---

## 3. Color System

### Philosophy
Cinema is a dark room. Dex should feel like one — immersive, focused, premium.

### Core Palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| Background | Cinema Black | `#0D1117` | Page background, base layer |
| Surface | Deep Navy | `#161B22` | Cards, panels, sidebars |
| Surface Elevated | Card Navy | `#1C2333` | Elevated cards, modals |
| Border | Subtle Border | `#30363D` | Card borders, dividers |
| Primary Accent | Royal Purple | `#7C3AED` | CTAs, active states, highlights |
| Primary Soft | Violet Glow | `#A855F7` | Hover states, gradients, icons |
| Achievement | Cinema Gold | `#F59E0B` | Ratings, badges, achievements, stars |
| Achievement Soft | Warm Amber | `#FCD34D` | Rating hover, badge shimmer |
| Active/Live | Teal Pulse | `#2DD4BF` | Currently Watching indicator |
| Text Primary | Soft White | `#E2E8F0` | Headings, primary text |
| Text Secondary | Muted Grey | `#8B949E` | Subtitles, metadata, timestamps |
| Text Disabled | Dark Grey | `#484F58` | Disabled states, placeholders |
| Danger | Soft Red | `#F87171` | Dropped status, errors |

### CSS Variables

```css
:root {
  /* Backgrounds */
  --bg-base: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #1C2333;
  --bg-border: #30363D;

  /* Accents */
  --accent-primary: #7C3AED;
  --accent-primary-soft: #A855F7;
  --accent-gold: #F59E0B;
  --accent-gold-soft: #FCD34D;
  --accent-teal: #2DD4BF;

  /* Text */
  --text-primary: #E2E8F0;
  --text-secondary: #8B949E;
  --text-disabled: #484F58;
  --text-danger: #F87171;

  /* Glass */
  --glass-bg: rgba(28, 35, 51, 0.6);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: blur(16px);
}
```

### Gradient Definitions

```css
/* Hero gradient — used on profile banner */
--gradient-hero: linear-gradient(135deg, #0D1117 0%, #1a0a2e 50%, #0D1117 100%);

/* Purple glow — used on featured cards */
--gradient-purple: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);

/* Gold shimmer — used on achievement badges */
--gradient-gold: linear-gradient(135deg, #F59E0B 0%, #FCD34D 50%, #F59E0B 100%);

/* Card overlay — poster cards bottom fade */
--gradient-poster: linear-gradient(to top, rgba(13,17,23,0.95) 0%, transparent 60%);
```

### Colors to Avoid
- Pure Black `#000000` — too harsh, feels cheap
- Bright Red `#FF0000` — aggression, wrong vibe
- Pure White `#FFFFFF` — burns on dark background
- More than 3 accent colors simultaneously

---

## 4. Typography

### Philosophy
Titles need weight. Content deserves to feel like a *title*, not a list item.

### Font Stack

| Role | Font | Fallback |
|---|---|---|
| Display / Hero | `Inter` (800–900) | `system-ui`, `sans-serif` |
| Headings | `Inter` (600–700) | `system-ui`, `sans-serif` |
| Body | `Inter` (400–500) | `system-ui`, `sans-serif` |
| Metadata / Labels | `Inter` (400) | `system-ui`, `sans-serif` |
| Stats / Numbers | `Inter` (700–800, tabular) | `system-ui`, `sans-serif` |

> **Why Inter?** Minimal, clean, highly legible at all sizes. Works perfectly on dark backgrounds. Used by Linear, Vercel, and most premium SaaS products.

### Type Scale

```css
/* Display — Hero stats, profile name */
--text-display: clamp(2.5rem, 5vw, 4rem);     /* 40–64px */
font-weight: 800;

/* H1 — Section titles */
--text-h1: clamp(1.75rem, 3vw, 2.25rem);      /* 28–36px */
font-weight: 700;

/* H2 — Card titles, movie names */
--text-h2: clamp(1.25rem, 2vw, 1.5rem);       /* 20–24px */
font-weight: 600;

/* H3 — Sub-section labels */
--text-h3: 1rem;                               /* 16px */
font-weight: 600;

/* Body — Reviews, descriptions */
--text-body: 0.9375rem;                        /* 15px */
font-weight: 400;
line-height: 1.6;

/* Small — Metadata, timestamps, episode info */
--text-small: 0.8125rem;                       /* 13px */
font-weight: 400;

/* Label — Badges, status pills, tags */
--text-label: 0.75rem;                         /* 12px */
font-weight: 500;
letter-spacing: 0.05em;
text-transform: uppercase;
```

---

## 5. UI Style System

### Style Stack
**Dark Mode + Glassmorphism + Bento Grid + Bold Typography**

Each layer serves a purpose:

| Style | Purpose | Psychological Effect |
|---|---|---|
| Dark Mode | Base canvas | Cinema room feel — "I'm in my element" |
| Glassmorphism | Card surfaces | Premium shelf feel — "This looks like it belongs here" |
| Bento Grid | Layout structure | Displays volume — "Look how much I've watched" |
| Bold Typography | Content presentation | Respect — "My taste is being taken seriously" |

---

## 6. Glassmorphism Rules

### The Glass Card

```css
.glass-card {
  background: var(--glass-bg);                    /* rgba(28,35,51,0.6) */
  backdrop-filter: var(--glass-blur);             /* blur(16px) */
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);          /* rgba(255,255,255,0.08) */
  border-radius: 16px;
}
```

### Glass Variants

```css
/* Standard card */
.glass-card-default {
  background: rgba(28, 35, 51, 0.60);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Featured / highlighted card */
.glass-card-featured {
  background: rgba(124, 58, 237, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(124, 58, 237, 0.30);
}

/* Achievement card */
.glass-card-achievement {
  background: rgba(245, 158, 11, 0.10);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

/* Currently Watching card */
.glass-card-active {
  background: rgba(45, 212, 191, 0.08);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(45, 212, 191, 0.20);
}
```

### Glass Rules
- Always place glass cards over a background with visual content (gradient, poster art, subtle texture) — glass on flat colour is wasted
- Minimum text contrast ratio of 4.5:1 against glass background
- Never stack more than 2 glass layers deep
- Use `border-radius: 16px` as the default; `12px` for compact cards; `24px` for hero cards

---

## 7. Bento Grid Layout

### Philosophy
Different card sizes = different importance. Steam's library logic applied to watch history.

### Grid Definition

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  padding: 24px;
}

/* Card size classes */
.bento-2x2  { grid-column: span 3;  grid-row: span 2; }  /* Small stat */
.bento-3x2  { grid-column: span 4;  grid-row: span 2; }  /* Poster card */
.bento-4x2  { grid-column: span 6;  grid-row: span 2; }  /* Featured card */
.bento-6x2  { grid-column: span 8;  grid-row: span 2; }  /* Currently watching */
.bento-12x1 { grid-column: span 12; grid-row: span 1; }  /* Activity feed row */
```

### Profile Page Grid Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    PROFILE BANNER (12x2)                    │
│              Avatar | Name | Stats overview                 │
├──────────────────────────┬──────────────┬───────────────────┤
│   CURRENTLY WATCHING     │  HOURS       │   TITLES          │
│   (6x2) — big card       │  WATCHED     │   COMPLETED       │
│   with poster + progress │  (3x2)       │   (3x2)           │
├────────────┬─────────────┴──────────────┴───────────────────┤
│  TOP GENRE │        SHOWCASE — Top 5 Titles (8x2)           │
│  RADAR     │        Horizontal scroll of poster cards       │
│  (4x2)     │                                                │
├────────────┴────────────────────────────────────────────────┤
│              RECENT ACTIVITY FEED (12x1 rows)               │
│  "Shreyas rated Demon Slayer 9/10 · 2h ago"                │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Component Library

### Status Pills

```css
/* Watching */
.status-watching {
  background: rgba(45, 212, 191, 0.15);
  color: #2DD4BF;
  border: 1px solid rgba(45, 212, 191, 0.30);
}

/* Completed */
.status-completed {
  background: rgba(124, 58, 237, 0.15);
  color: #A855F7;
  border: 1px solid rgba(124, 58, 237, 0.30);
}

/* Plan to Watch */
.status-planned {
  background: rgba(139, 148, 158, 0.15);
  color: #8B949E;
  border: 1px solid rgba(139, 148, 158, 0.25);
}

/* Dropped */
.status-dropped {
  background: rgba(248, 113, 113, 0.15);
  color: #F87171;
  border: 1px solid rgba(248, 113, 113, 0.25);
}
```

### Star Rating

```css
/* Filled star */
.star-filled { color: #F59E0B; }

/* Empty star */
.star-empty  { color: #30363D; }

/* Hover state */
.star:hover  { color: #FCD34D; transform: scale(1.15); }
```

### Buttons

```css
/* Primary CTA */
.btn-primary {
  background: var(--accent-primary);       /* #7C3AED */
  color: #FFFFFF;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.btn-primary:hover {
  background: var(--accent-primary-soft);  /* #A855F7 */
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
}

/* Secondary — Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--bg-border);
  border-radius: 8px;
  padding: 10px 20px;
}
.btn-ghost:hover {
  border-color: var(--accent-primary-soft);
  color: var(--accent-primary-soft);
}
```

### Poster Card

```css
.poster-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 2/3;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.poster-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(124, 58, 237, 0.3);
}
.poster-card .overlay {
  position: absolute;
  inset: 0;
  background: var(--gradient-poster);
}
.poster-card .meta {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
}
```

---

## 9. Badge & Achievement System

### Badge Tiers

| Tier | Color | Glow |
|---|---|---|
| **Bronze** | `#CD7F32` | `rgba(205,127,50,0.3)` |
| **Silver** | `#C0C0C0` | `rgba(192,192,192,0.3)` |
| **Gold** | `#F59E0B` | `rgba(245,158,11,0.4)` |
| **Platinum** | `#A855F7` | `rgba(168,85,247,0.4)` |

### V1 Badge List

| Badge | Trigger | Tier |
|---|---|---|
| First Log | Log your first title | Bronze |
| Binge Starter | Watch 10 titles | Bronze |
| Night Owl | Log 5 titles after midnight | Bronze |
| Century Club | Complete 100 titles | Silver |
| Genre Master | Rate 20 titles in one genre | Silver |
| Anime Veteran | Complete 50 anime titles | Silver |
| 500 Hours | Accumulate 500 hours watched | Gold |
| Top Reviewer | Write 25 reviews | Gold |
| Binge Master | Complete a series in under 48h | Gold |
| Taste Maker | Have 10 followers | Gold |
| Completionist | Complete a full series with 50+ episodes | Platinum |
| 1000 Hours | Accumulate 1000 hours watched | Platinum |

### Badge CSS

```css
.badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid currentColor;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.badge:hover {
  transform: scale(1.1);
  box-shadow: 0 0 16px var(--badge-glow);
}
.badge-gold {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.10);
  --badge-glow: rgba(245, 158, 11, 0.4);
}
.badge-platinum {
  color: #A855F7;
  background: rgba(168, 85, 247, 0.10);
  --badge-glow: rgba(168, 85, 247, 0.4);
}
```

---

## 10. Animation & Motion

### Principles
- Subtle by default — animations enhance, never distract
- Fast feedback (under 200ms) for interactions
- Slower reveals (300–500ms) for content loading
- Always respect `prefers-reduced-motion`

### Core Transitions

```css
/* Default transition */
--transition-fast:   all 0.15s ease;
--transition-base:   all 0.25s ease;
--transition-slow:   all 0.4s ease;

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

### Key Animations

```css
/* Card hover lift */
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  transition: var(--transition-base);
}

/* Fade in on load */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeInUp 0.4s ease forwards; }

/* Purple glow pulse — Currently Watching indicator */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(45, 212, 191, 0.3); }
  50%       { box-shadow: 0 0 20px rgba(45, 212, 191, 0.7); }
}
.currently-watching { animation: glowPulse 2s ease-in-out infinite; }

/* Badge shimmer */
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.badge-gold {
  background: linear-gradient(90deg, #F59E0B, #FCD34D, #F59E0B);
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
}
```

---

## 11. Spacing & Border Radius

### Spacing Scale (8px base)

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Border Radius Scale

```css
--radius-sm:   6px;   /* Tags, pills, small buttons */
--radius-md:   10px;  /* Inputs, compact cards */
--radius-lg:   16px;  /* Standard cards */
--radius-xl:   24px;  /* Hero cards, modals */
--radius-full: 9999px; /* Avatars, status dots */
```

---

## 12. Iconography

- **Library:** [Lucide Icons](https://lucide.dev) — clean, consistent, minimal
- **Size:** 16px (inline), 20px (default), 24px (prominent), 32px (featured)
- **Color:** Match context — `var(--text-secondary)` for UI icons, accent colors for active states
- **Style:** Stroke-based, 1.5px stroke width, never filled icons

### Key Icons for Dex

| Feature | Icon |
|---|---|
| Watchlist | `bookmark` |
| Currently Watching | `play-circle` |
| Completed | `check-circle` |
| Dropped | `x-circle` |
| Rating | `star` |
| Friends | `users` |
| Activity Feed | `activity` |
| Hours Watched | `clock` |
| Badges | `award` |
| Search | `search` |
| Profile | `user` |

---

## 13. Content Type System

### Categories & Visual Identity

| Type | Accent Color | Status Prefix |
|---|---|---|
| Movies | `#7C3AED` Purple | 🎬 |
| Series | `#2DD4BF` Teal | 📺 |
| Anime | `#F59E0B` Gold | ⛩️ |

> Category can be identified at a glance by the left border accent color on cards.

---

## 14. Responsive Breakpoints

```css
--bp-sm:  640px;   /* Mobile landscape */
--bp-md:  768px;   /* Tablet */
--bp-lg:  1024px;  /* Laptop */
--bp-xl:  1280px;  /* Desktop */
--bp-2xl: 1536px;  /* Wide desktop */
```

### Mobile Behaviour
- Bento grid collapses to single column on mobile
- Glass cards simplify — reduce blur to `blur(8px)` for performance
- Profile banner switches to vertical layout
- Bottom navigation bar replaces sidebar

---

## 15. Data APIs

| Data Source | Purpose | Free Tier |
|---|---|---|
| [TMDB API](https://www.themoviedb.org/documentation/api) | Movies + Series metadata, posters, ratings | Yes — unlimited |
| [Jikan API](https://jikan.moe) | Anime metadata (MyAnimeList wrapper) | Yes — rate limited |

### Image Handling (TMDB)
```
Poster base URL:    https://image.tmdb.org/t/p/w500/{poster_path}
Backdrop base URL:  https://image.tmdb.org/t/p/w1280/{backdrop_path}
```

---

## 16. Tech Stack Reference

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Custom CSS Variables |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL + Auth) |
| Anime Data | Jikan API |
| Movie/Series Data | TMDB API |
| Deploy — Frontend | Vercel |
| Deploy — Backend | Render |

---

## 17. Design Checklist (Before Shipping Any Page)

- [ ] Dark background base is `#0D1117` — not pure black
- [ ] All text meets 4.5:1 contrast ratio minimum
- [ ] Glass cards have a visual background behind them (not flat colour)
- [ ] No more than 3 accent colours visible simultaneously
- [ ] Hover states are defined for all interactive elements
- [ ] `prefers-reduced-motion` media query is respected
- [ ] Currently Watching has the teal glow pulse
- [ ] Ratings use gold — never purple
- [ ] Poster cards have the gradient overlay for text legibility
- [ ] Bento grid has a clear visual hierarchy — not all cards the same size

---

*Dex Design System v1.0 — Built for watchers, by a watcher.*
