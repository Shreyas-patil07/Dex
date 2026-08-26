# BUILD DEX — PRODUCTION-QUALITY FRONTEND

You are building the frontend of **Dex**, an entertainment identity platform for people who watch movies and series.

## IMPORTANT

I am providing:
1. The **Dex Front-End Deep Research Report**
2. The **Dex product blueprint / project context**
3. The **Dex visual style guide**
4. The **Dex logo**

Treat these as the primary product/design specification.

**Do not redesign Dex into your own generic interpretation.**
Use the research to make concrete implementation decisions.

The goal is NOT to make a generic movie website.

The goal is:

> **Build an entertainment identity product where the user's watch history becomes a living visual representation of who they are.**

Dex tagline:

> **Your watch history. Your identity.**

The interface should feel like:

> **A cinematic mirror of the user's entertainment taste.**

It should NOT feel like:
- Netflix clone
- IMDb clone
- Letterboxd clone
- Trakt clone
- TikTok clone
- Generic AI dashboard
- SaaS admin panel
- Gaming dashboard
- Crypto/neon website
- Dribbble concept that is impossible to use

---

# 1. FIRST: STUDY ALL ATTACHED MATERIALS

Before writing the UI:

- Read the attached research report completely.
- Read the Dex blueprint/project specification.
- Read the Dex theme/style guide.
- Inspect the supplied Dex logo carefully.

Extract:

- brand principles
- visual language
- information architecture
- psychological principles
- navigation recommendations
- profile architecture
- recommendation UX
- discovery UX
- motion system
- accessibility requirements
- performance requirements
- MVP scope
- future features

Do not silently contradict them.

Where the research explicitly recommends changing the old Dex design, follow the research.

---

# 2. CORE PRODUCT EXPERIENCE

Dex's central loop:

```text
WATCH
   ↓
LOG
   ↓
DEX LEARNS
   ↓
TASTE MODEL IMPROVES
   ↓
PROFILE EVOLVES
   ↓
DISCOVER SOMETHING
   ↓
WATCH
```

Every important UI decision should reinforce this loop.

The product should communicate:

> "The more you use Dex, the more it understands you."

But do this visually and through interaction—not through huge explanatory paragraphs.

---

# 3. DESIGN THESIS

Use this as the starting principle:

> **Dex should feel like a cinematic reflection of the user's entertainment identity.**

The interface should be:

- cinematic
- personal
- intelligent
- editorial
- refined
- expressive
- data-aware
- calm
- fast
- highly visual

Avoid excessive visual effects.

The product should feel **premium because of composition, hierarchy, typography, spacing, imagery, and motion—not because every surface has gradients and blur.**

---

# 4. VISUAL DIRECTION

Use a dark-first visual system.

Base:

```text
Cinema Black
#08080C or a very dark near-black
```

Primary brand:

```text
Royal Purple
#7C3AED
```

Secondary purple:

```text
#A855F7
```

Optional supporting:

```text
Teal
#2DD4BF

Gold
#F59E0B
```

BUT:

### Purple must be the dominant brand accent.

Teal and gold are semantic accents, not competing brand colors.

Use:

### Purple
- primary actions
- active navigation
- focus states
- brand highlights
- taste-related emphasis

### Teal
- currently watching
- active/live state
- positive progression where appropriate

### Gold
- achievements
- rarity
- special discoveries
- premium/status moments

Do not use all three aggressively on the same screen.

---

# 5. GLASSMORPHISM

Do NOT make the entire website glassmorphic.

Use translucent surfaces selectively:

- floating navigation
- hero overlays
- modals
- special identity cards
- contextual panels

Prefer:

> dark solid/near-solid cinematic surfaces

for most UI.

Glass should create depth, not become the identity.

Do not stack multiple translucent layers.

Avoid expensive large-area blur effects.

---

# 6. TYPOGRAPHY

Primary font:

> Inter

Use strong typography hierarchy.

Suggested:

- Display: 48–72px desktop
- H1: 32–48px
- H2: 24–32px
- H3: 18–20px
- Body: 14–16px
- Metadata: 12–14px
- Numbers/statistics: bold/tabular numerals

Do not make every heading oversized.

Movie titles should feel editorial and important.

---

# 7. LAYOUT PRINCIPLES

Use a disciplined grid.

Prefer:

- strong whitespace
- asymmetric compositions where useful
- controlled card sizes
- large visual anchors
- clear hierarchy

Bento layouts may be used especially on the profile, but DO NOT make every page a bento grid.

The design should never feel like:

> "12 cards randomly placed on a dashboard."

Every section needs a reason to exist.

---

# 8. RESPONSIVE DESIGN

This must be genuinely responsive.

Do NOT create desktop UI and simply shrink it.

### Mobile

Use a persistent bottom navigation:

```text
Home
Discover
+ / Log
Library
Profile
```

Keep primary navigation to roughly five items or fewer.

### Desktop

Use a left sidebar:

```text
DEX

Home
Discover
Library
Profile
Social

────────────

Search
Settings
```

Sidebar may collapse to icon-only mode.

### Tablet

Use a hybrid layout appropriate to available width.

All layouts should reflow naturally.

---

# 9. BUILD THESE ROUTES

Implement the following frontend routes:

```text
/
Landing / marketing page

/onboarding
Initial taste setup

/home
Main personalized experience

/discover
Personalized discovery

/library
All personal media

/library/watched
Watched media

/library/watchlist
Want to Watch

/library/queue
Current Queue

/search
Global search

/movie/[id]
Movie detail

/show/[id]
Series detail

/profile/[username]
Public/private profile

/taste
Taste DNA / taste exploration

/achievements
Achievements

/social
Taste/social experience

/settings
Settings
```

Keep the architecture modular so routes can later connect to the actual FastAPI/Supabase backend.

---

# 10. LANDING PAGE

The landing page should NOT look like a SaaS landing page.

Do not create:

> hero + 3 generic feature cards + pricing table + testimonials

Instead communicate the concept visually.

Hero concept:

> **Your watch history. Your identity.**

Subheadline:

> Dex learns what you love, shows you what to watch next, and turns your entertainment history into something uniquely yours.

Primary CTA:

> Start building your Dex

Secondary CTA:

> Explore a profile

Use the Dex logo prominently.

Create a cinematic visual showing a profile becoming more personalized.

Show examples of:

- Taste DNA
- recommendation explanation
- profile evolution
- achievements
- identity card

The landing page should sell the **idea of entertainment identity**, not a list of features.

---

# 11. ONBOARDING

Build a highly polished onboarding experience.

Do NOT make it a boring form.

Flow:

### Step 1

Welcome:

> Welcome to Dex.

> Let's figure out what you watch.

### Step 2

Favorite titles.

Show visual poster cards.

Allow selecting multiple.

### Step 3

Taste calibration.

Examples:

> Inception vs Interstellar

> Dark vs Stranger Things

Ask a small number of fast preference questions.

### Step 4

Show a dynamic taste preview.

Example:

```text
YOUR TASTE IS STARTING TO TAKE SHAPE

Psychological ████████ 82%
Sci-Fi        ███████  74%
Thriller      ███████  71%
Comedy        ███      34%
```

### Step 5

Generate first recommendation.

Example:

> Dex found something for you.

> 94% match

> Because you love:
> Psychological stories
> Sci-Fi
> Slow-burn thrillers

CTA:

> Explore my Dex

The onboarding should create a genuine "Dex understands me" moment.

---

# 12. MAIN HOME EXPERIENCE

This is the most important application screen.

Above the fold should answer:

> **What should I watch next?**

But simultaneously communicate identity.

Hero:

```text
Good evening, Shreyas.

DEX FOUND SOMETHING FOR YOU

[ LARGE BACKDROP / POSTER ]

THE HANDMAIDEN

94% MATCH

Because you:
• strongly prefer psychological thrillers
• rate slow-burn stories highly
• often like international cinema

[Add to Watchlist]
[View Details]
```

Do NOT make this a giant Netflix hero.

The recommendation should feel like **Dex personally discovered something**, not like a streaming service advertising content.

---

# 13. HOME SECTIONS

Use this order as the starting structure:

### 1. Personalized insight

Example:

> Your taste has shifted toward psychological thrillers this month.

### 2. Primary recommendation

The strongest personalized recommendation.

### 3. Continue Watching

Only show if relevant.

### 4. Today's Discovery

Exactly 3–5 meaningful recommendations.

Categorize:

```text
SAFE
High confidence

ADJACENT
A little outside your usual taste

WILDCARD
Something Dex thinks you might unexpectedly love
```

### 5. Taste Insight

Example:

> You have a thing for unreliable narrators.

### 6. Progress / achievements

Only relevant progress.

### 7. Watchlist

Only if populated.

### 8. Memories

Example:

> On this day, 3 years ago...

Do not overload the homepage.

---

# 14. DISCOVERY PAGE

Do NOT build a Netflix-style infinite recommendation wall.

Dex discovery must feel deliberate.

Top:

> **YOUR DISCOVERY**

Subheading:

> 3 things Dex thinks you'll love today.

Then:

```text
01
SAFE

[Poster]
94% Match

02
ADJACENT

[Poster]
87% Match

03
WILDCARD

[Poster]
73% Match
```

After the final recommendation:

> **That's all for now.**

> Watch something, update your taste, and Dex will find more.

This is intentional.

Do not infinite-scroll.

---

# 15. TASTE EXPLORATION

Build a dedicated `/taste` experience.

The goal is NOT to show technical AI vectors.

It should communicate:

> **This is what Dex thinks you like.**

Example:

```text
YOUR TASTE DNA

SCI-FI           92%
PSYCHOLOGICAL    87%
THRILLER         84%
SLOW BURN        79%
DARK             76%
COMEDY           38%
```

Use horizontal bars instead of unnecessarily complicated radar charts.

Below:

### Your Obsessions

Christopher Nolan  
Denis Villeneuve  
Jake Gyllenhaal  
Psychological thrillers  
2010s cinema

### Your strongest combinations

```text
Sci-Fi + Thriller
Psychological + Mystery
Crime + Drama
```

### Your blind spots

Example:

> You've barely explored Korean cinema.

CTA:

> Explore your blind spot

---

# 16. PROFILE

The profile is the **heart of Dex**.

It must not feel like a stats dashboard.

It should feel like:

> **A visual identity card for the person behind the screen.**

Desktop structure:

```text
┌──────────────────────────────────────────────────┐
│                 PROFILE BANNER                   │
│                                                  │
│ Avatar   Shreyas                                 │
│          Psychological Sci-Fi Enthusiast         │
│                                                  │
│          1,284 Titles · 426 Hours                │
└──────────────────────────────────────────────────┘

┌────────────────┬──────────────────┬─────────────┐
│ TASTE DNA      │ TOP OBSESSIONS   │ STATS       │
│                │                  │             │
│ Genre bars     │ Nolan            │ 1,284       │
│ Themes         │ Villeneuve       │ titles      │
│ Mood           │ Thriller         │ 426h        │
└────────────────┴──────────────────┴─────────────┘

┌───────────────────────────┬─────────────────────┐
│ TASTE EVOLUTION           │ ACHIEVEMENTS        │
│                           │                     │
│ timeline                  │ rare badges         │
└───────────────────────────┴─────────────────────┘
```

Mobile should stack intelligently.

---

# 17. PROFILE PERSONALIZATION

Every user profile should feel somewhat different.

Automatically derive:

### Accent

from dominant taste.

### Background atmosphere

from taste.

### Hero imagery

from highly rated media.

### Subtitle

from dominant taste combination.

Example:

> Psychological Sci-Fi Enthusiast

Allow user overrides.

BUT:

Never destroy the automatically generated identity.

The profile should feel:

> generated from who you are.

Not:

> user picked a random theme.

---

# 18. TASTE EVOLUTION

Add a visual section:

> **YOUR TASTE EVOLVED**

Example:

```text
2023
Action ████████
Comedy █████

2024
Thriller █████████
Action   ██████

2025
Psychological ██████████
Sci-Fi        ████████
```

Use a clean timeline.

Make it visually beautiful but easy to understand.

---

# 19. STATS

Show only statistics that actually say something.

Examples:

```text
1,284
Titles Watched

426h
Time Watched

37
Countries

18
Decades

72%
Thriller
```

Then deeper details can be opened.

Do NOT produce a giant analytics dashboard.

---

# 20. ACHIEVEMENTS

Use identity-rich badges.

Examples:

### Nolan Completionist

### Hidden Gem Hunter

### Global Explorer

### 90s Specialist

### Psychological Thriller Expert

Each badge should show:

- icon
- name
- progress
- rarity
- description

Example:

```text
NOLAN COMPLETIONIST

10 / 12 films

RARE · 6.4% of users

You've explored almost Nolan's entire filmography.
```

Make the unlocked state beautiful.

Keep animation subtle.

---

# 21. MOVIE DETAIL PAGE

Design a premium cinematic page.

Structure:

```text
FULL BACKDROP
        ↓
POSTER + INFORMATION

THE BATMAN

2022 · 2h 56m
Crime · Thriller · Drama

94% MATCH FOR YOU

Because:
• You rate psychological thrillers highly
• You love dark crime stories
• You liked Prisoners

[Watched]
[Rate]
[Add to Watchlist]

YOUR HISTORY
You watched this genre 31 times.

SIMILAR FOR YOU

[Cards]
```

Use the backdrop carefully.

Text must remain readable.

---

# 22. RECOMMENDATION CARD

Build a reusable `RecommendationCard`.

It should support:

- poster
- match score
- title
- year
- genre
- reason
- add/watch/log actions

Example:

```text
94% MATCH

PRISONERS
2013 · Thriller

Because you love:
Psychological
Dark
Slow-burn

[Add]
```

Do not turn cards into mini dashboards.

Keep them visually focused.

---

# 23. SEARCH

Create global search.

Search:

- movies
- series
- actors
- directors
- users
- lists

Search should feel instantaneous.

Use:

- keyboard shortcut
- fuzzy search
- autocomplete
- recent search
- categorized results

Desktop:

> Cmd/Ctrl + K

Mobile:

> prominent search input

---

# 24. LIBRARY

Create a beautiful media library.

Tabs:

```text
Watched
Want to Watch
Queue
Favorites
Disliked
```

Use filters:

```text
Movies
Series
Genre
Year
Rating
Recently Added
```

Do not make it feel like a spreadsheet.

Offer:

### Grid view

and

### List view

Grid for browsing.

List for data-heavy review.

---

# 25. WATCH LOGGING

Logging must be extremely fast.

Ideal UX:

Search title →

Quick action:

> Watched

Then optionally:

> Rate

> Add date

The user should never have to navigate through multiple forms to mark a movie watched.

Also support future natural language logging architecture:

> "Watched Interstellar yesterday. 9/10."

For the initial frontend use a modal/command system that can later be connected to NLP.

---

# 26. SOCIAL

Social should be taste-first.

NOT:

> another social feed.

Main social sections:

### Taste Twins

### Compatibility

### Friends

### Shared Lists

Example:

```text
YOU + ALEX

91% TASTE COMPATIBILITY

You both love:
Sci-Fi
Thrillers
Slow Burn

You disagree on:
Romance

[Explore Alex's Taste]
```

Use social activity sparingly.

---

# 27. LEADERBOARD

Do NOT lead with:

> Most hours watched.

Prefer:

- Genre Explorer
- Hidden Gem Hunter
- Director Completion
- Taste Diversity
- Country rankings

The leaderboard should celebrate taste, not excessive consumption.

---

# 28. DEX DROPS / SHORT-FORM

Implement the frontend architecture for future micro-content.

Call it:

> **Dex Drops**

unless the research attachment indicates a stronger final name.

Do NOT build a TikTok clone.

Use a finite session:

```text
DROP 1 / 5
DROP 2 / 5
DROP 3 / 5
DROP 4 / 5
DROP 5 / 5
```

Then:

> That's all for now.

Content examples:

- micro recommendation
- movie fact
- taste insight
- blind pick
- director story
- short trailer/preview

Build the UI architecture so this feature can later be connected to a real content API.

---

# 29. MEMORY EXPERIENCE

Build a small but beautiful memory component.

Example:

```text
ON THIS DAY

3 YEARS AGO

You watched:

INTERSTELLAR

★★★★★

Since then:
17 more Sci-Fi films
```

This should feel emotional, not like a notification.

---

# 30. EMPTY STATES

Never use:

> No data found.

Instead use personality.

Examples:

### Empty profile

> Your entertainment identity starts here.

### Empty library

> Nothing here yet.

> Log your first watch.

### Empty recommendations

> Give Dex a few watches to understand you.

### Empty friends

> Find people who watch like you.

---

# 31. MOTION

Motion must have a purpose.

Use:

- 100–200ms micro interactions
- ~200–300ms standard transitions
- up to ~600ms for major achievement/reveal moments

Use:

- opacity
- transform
- scale
- position
- subtle color transitions

Avoid:

- constant looping animation
- excessive parallax
- giant blur animations
- unnecessary page transitions

Respect:

```css
prefers-reduced-motion
```

---

# 32. DEX LOGO MOTION

The supplied Dex logo is a key brand asset.

It combines:

- D
- play symbol
- incomplete orbit

Use this concept consistently.

Potential animation:

```text
1. Orbit starts incomplete
2. Orbit traces around
3. Play symbol activates
4. D resolves
5. Interface appears
```

Use this for:

- initial loading
- onboarding reveal
- recommendation reveal
- taste evolution
- achievement unlock

Do NOT place the animated logo everywhere.

The logo should become memorable because it is used selectively.

---

# 33. PERFORMANCE IS NON-NEGOTIABLE

The site must feel fast.

Prioritize:

### Images

Use optimized responsive images.

### Posters

Do not load full-resolution images for small cards.

### Lazy loading

Lazy-load offscreen posters.

### Code splitting

Only load page-specific functionality.

### Motion

Prefer transform/opacity.

### Blur

Avoid expensive large-area backdrop blur.

### Charts

Do not render unnecessary charts.

### Skeletons

Use stable skeleton layouts to prevent layout shift.

### Caching

Structure the frontend for client/server caching.

### Routing

Pages should feel instant when navigating.

Never sacrifice performance for decorative effects.

---

# 34. ACCESSIBILITY

Must support:

- keyboard navigation
- visible focus states
- semantic HTML
- correct heading hierarchy
- screen readers
- alt text
- sufficient contrast
- reduced motion
- accessible forms
- touch-friendly targets

Do not sacrifice accessibility to make the dark cinematic design look "cool."

---

# 35. FRONTEND STACK

Use:

### Framework

Next.js + React

### Language

TypeScript

### Styling

Tailwind CSS

### Components

shadcn/ui / Radix primitives where useful

### Animation

Motion / Framer Motion

### Charts

Recharts initially

### Server state

TanStack Query where needed

### Local UI state

Zustand only where necessary

Do not overengineer state management.

---

# 36. ARCHITECTURE

Use a scalable component architecture.

Example:

```text
app/
├── (marketing)/
├── (app)/
├── discover/
├── library/
├── movie/
├── show/
├── profile/
├── taste/
├── achievements/
├── social/
└── settings/

components/
├── brand/
├── navigation/
├── media/
├── recommendation/
├── profile/
├── taste/
├── achievements/
├── social/
├── feedback/
└── layout/

lib/
├── mock-data
├── utils
├── formatters
├── recommendation
└── theme
```

Use reusable components.

Do not put the entire application into one page file.

---

# 37. COMPONENTS

At minimum create reusable:

```text
DexLogo
DexSidebar
DexBottomNav
DexSearch
MoviePoster
MovieCard
SeriesCard
RecommendationCard
TasteCard
TasteBar
TasteInsight
StatCard
AchievementBadge
AchievementCard
ProfileHeader
ProfileBanner
TasteEvolution
MemoryCard
TasteMatchCard
DiscoveryCard
Modal
Drawer
Toast
RatingInput
StatusPill
```

Components must have variants rather than duplicated markup.

---

# 38. MOCK DATA

Since the backend may not yet be connected:

Create realistic mock data.

Use enough media examples to make the product feel populated.

Include:

- popular films
- niche films
- series
- directors
- genres
- sample user profile
- sample achievements
- sample recommendations
- sample social data

But make the data architecture easy to replace with API data later.

Do NOT hardcode every component independently.

Create centralized typed data models.

---

# 39. INTERACTION QUALITY

Implement interactions.

Examples:

### Add to watchlist

Button changes instantly.

### Mark watched

Profile/stats update visually.

### Rating

Smooth interactive rating.

### Search

Instant filtered results.

### Filter

Immediate UI feedback.

### Navigation

Smooth transitions.

### Profile

Hover/tap interactions.

### Badge

Detailed reveal.

### Recommendation

Expandable reason.

### Taste update

Animate the changed taste value.

All actions should feel responsive.

---

# 40. SIGNATURE DEX INTERACTION

Implement a prototype of:

> **Taste Evolution Flow**

When the user marks a title watched:

1. Confirmation animation.
2. Taste bars subtly update.
3. A relevant insight appears.

Example:

```text
YOU JUST CHANGED YOUR TASTE

Psychological
82% → 86%

Sci-Fi
74% → 77%

New pattern discovered:

"You're increasingly drawn to
slow-burn psychological stories."
```

This should be one of the most memorable interactions in the prototype.

---

# 41. FIRST-SESSION WOW

After onboarding:

Show:

```text
DEX HAS A READ ON YOU

Psychological Sci-Fi
Thriller
Slow Burn
International Cinema

↓

YOUR FIRST DEX PICK

[Poster]

94% MATCH

Because your taste says:
...
```

Use controlled motion.

This is the first major wow moment.

---

# 42. PROFILE WOW

A profile should feel different for different users.

For the sample user:

Use dynamic theme based on:

```text
Sci-Fi
Thriller
Psychological
```

Use the dominant colors subtly.

Do NOT hardcode every profile to purple.

Purple is the brand system.

The profile atmosphere should adapt within the system.

---

# 43. DESIGN QUALITY BAR

Before considering the frontend finished, inspect every screen for:

### Visual

- hierarchy
- spacing
- consistency
- alignment
- typography
- imagery
- contrast

### UX

- clear primary action
- understandable navigation
- no dead ends
- useful empty states
- useful loading states

### Interaction

- hover
- focus
- touch
- transitions
- feedback

### Performance

- no giant images
- no unnecessary blur
- no excessive animation
- no layout shifting

### Responsive

Test:

- 360px
- 390px
- 768px
- 1024px
- 1280px
- 1440px
- 1920px

---

# 44. DO NOT DO THESE THINGS

Absolutely avoid:

- excessive purple everywhere
- excessive glass
- huge glowing text
- random gradients
- fake 3D effects
- neon cyberpunk appearance
- unnecessary particles
- excessive rounded rectangles
- infinite carousels everywhere
- tiny text
- low contrast
- huge walls of metadata
- generic dashboard cards
- meaningless badges
- fake AI words like "neural intelligence"
- "AI-powered" everywhere
- random animations
- generic stock illustrations
- fake testimonials
- meaningless charts
- placeholder lorem ipsum
- unfinished sections
- broken mobile layouts

---

# 45. IMPORTANT: MAKE IT LOOK LIKE A REAL PRODUCT

Do not deliver a concept demo.

Deliver a polished product prototype.

Every page must feel intentionally designed.

Every button should work.

Every route should work.

Every navigation item should lead somewhere meaningful.

No obvious placeholder UI.

No "coming soon" sections unless absolutely necessary.

No empty dashboard with a few cards.

---

# 46. PRIORITY ORDER

Build in this order:

## Phase 1

1. Design system
2. App shell
3. Navigation
4. Landing
5. Onboarding
6. Home
7. Search
8. Library
9. Movie detail
10. Profile

## Phase 2

11. Taste DNA
12. Taste evolution
13. Achievements
14. Discovery
15. Social
16. Sharing

## Phase 3

17. Dex Drops
18. Advanced taste visualization
19. Taste Twins
20. Advanced animations

Do not spend more time polishing Phase 3 while Phase 1 is incomplete.

---

# 47. FINAL OUTPUT REQUIREMENT

Build the frontend, not just wireframes.

The result should be:

- responsive
- polished
- interactive
- coherent
- componentized
- performant
- accessible
- visually distinctive

Use the attached research as the source of truth for UX decisions.

---

# 48. FINAL PRODUCT TEST

After implementation, evaluate the result with these questions:

### Can a new user understand Dex in 5 seconds?

### Does the homepage feel personalized?

### Does the profile feel like an identity?

### Can I log a movie extremely quickly?

### Does Dex explain recommendations?

### Does the UI feel different for different users?

### Does the profile feel worth sharing?

### Is discovery finite and intentional?

### Does the interface feel cinematic without looking like Netflix?

### Does the dark UI feel premium without looking like a generic AI SaaS?

### Does the logo feel like part of the product rather than decoration?

### Is the site fast?

### Is mobile genuinely usable?

### Is every visual effect justified?

---

# 49. THE MOST IMPORTANT RULE

Do not optimize for:

> "How many things can we put on screen?"

Optimize for:

> **"How quickly can Dex make the user feel that it understands them?"**

The product should communicate:

> **Watch something. Log it. Watch Dex learn. See yourself change. Discover something new.**

That is what makes Dex different.

Build the frontend around that idea.