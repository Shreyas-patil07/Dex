// Mock data — realistic fixture data for all 4 pages
// Uses TMDB-style structure. Posters from picsum.photos as placeholders.

export type WatchStatus = 'watching' | 'completed' | 'planned' | 'dropped';
export type ContentType = 'movie' | 'series' | 'anime';

export interface WatchEntry {
  id: string;
  title: string;
  type: ContentType;
  year: number;
  genres: string[];
  poster: string;
  backdrop: string;
  rating: number | null; // 1-10
  status: WatchStatus;
  progress?: number; // 0-100 for watching
  episodes?: { watched: number; total: number };
  watchedAt: string;
  runtime: number; // minutes
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  earned: boolean;
  earnedAt?: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
}

export interface Recommendation {
  id: string;
  title: string;
  type: ContentType;
  year: number;
  genres: string[];
  poster: string;
  backdrop: string;
  matchScore: number; // 0-100
  matchReason: string;
  tmdbRating: number;
  synopsis: string;
}

export interface ActivityEvent {
  id: string;
  type: 'rated' | 'completed' | 'badge' | 'started' | 'added';
  title?: string;
  badgeName?: string;
  rating?: number;
  timestamp: string;
  icon: string;
}

// ─── Watch List ────────────────────────────────────────────────────────────
export const watchList: WatchEntry[] = [
  {
    id: '1',
    title: 'Dune: Part Two',
    type: 'movie',
    year: 2024,
    genres: ['Sci-Fi', 'Adventure'],
    poster: 'https://picsum.photos/seed/dune2/300/450',
    backdrop: 'https://picsum.photos/seed/dune2bg/1280/720',
    rating: 9,
    status: 'completed',
    watchedAt: '2024-03-15',
    runtime: 166,
  },
  {
    id: '2',
    title: 'Shogun',
    type: 'series',
    year: 2024,
    genres: ['Drama', 'Historical'],
    poster: 'https://picsum.photos/seed/shogun/300/450',
    backdrop: 'https://picsum.photos/seed/shogunbg/1280/720',
    rating: 10,
    status: 'completed',
    episodes: { watched: 10, total: 10 },
    watchedAt: '2024-04-10',
    runtime: 540,
  },
  {
    id: '3',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    type: 'anime',
    year: 2019,
    genres: ['Action', 'Fantasy'],
    poster: 'https://picsum.photos/seed/demonslayer/300/450',
    backdrop: 'https://picsum.photos/seed/demonslayerbg/1280/720',
    rating: 9,
    status: 'completed',
    episodes: { watched: 44, total: 44 },
    watchedAt: '2024-01-20',
    runtime: 1056,
  },
  {
    id: '4',
    title: 'The Bear',
    type: 'series',
    year: 2022,
    genres: ['Drama', 'Comedy'],
    poster: 'https://picsum.photos/seed/thebear/300/450',
    backdrop: 'https://picsum.photos/seed/thebearbg/1280/720',
    rating: null,
    status: 'watching',
    progress: 65,
    episodes: { watched: 21, total: 28 },
    watchedAt: '2024-07-01',
    runtime: 315,
  },
  {
    id: '5',
    title: 'Oppenheimer',
    type: 'movie',
    year: 2023,
    genres: ['Drama', 'History'],
    poster: 'https://picsum.photos/seed/oppenheimer/300/450',
    backdrop: 'https://picsum.photos/seed/oppenheimerbg/1280/720',
    rating: 8,
    status: 'completed',
    watchedAt: '2023-07-26',
    runtime: 180,
  },
  {
    id: '6',
    title: 'Attack on Titan: Final Season',
    type: 'anime',
    year: 2020,
    genres: ['Action', 'Drama', 'Dark Fantasy'],
    poster: 'https://picsum.photos/seed/aot/300/450',
    backdrop: 'https://picsum.photos/seed/aotbg/1280/720',
    rating: 10,
    status: 'completed',
    episodes: { watched: 87, total: 87 },
    watchedAt: '2023-11-05',
    runtime: 2088,
  },
  {
    id: '7',
    title: 'Severance',
    type: 'series',
    year: 2022,
    genres: ['Thriller', 'Sci-Fi'],
    poster: 'https://picsum.photos/seed/severance/300/450',
    backdrop: 'https://picsum.photos/seed/severancebg/1280/720',
    rating: null,
    status: 'planned',
    watchedAt: '2024-07-15',
    runtime: 0,
  },
  {
    id: '8',
    title: 'Poor Things',
    type: 'movie',
    year: 2023,
    genres: ['Comedy', 'Drama', 'Sci-Fi'],
    poster: 'https://picsum.photos/seed/poorthings/300/450',
    backdrop: 'https://picsum.photos/seed/poorthingsbg/1280/720',
    rating: 7,
    status: 'completed',
    watchedAt: '2024-02-10',
    runtime: 141,
  },
  {
    id: '9',
    title: 'Rebel Moon — Part Two',
    type: 'movie',
    year: 2024,
    genres: ['Sci-Fi', 'Action'],
    poster: 'https://picsum.photos/seed/rebelmoon/300/450',
    backdrop: 'https://picsum.photos/seed/rebelmoonbg/1280/720',
    rating: 4,
    status: 'dropped',
    watchedAt: '2024-04-22',
    runtime: 122,
  },
  {
    id: '10',
    title: 'Interstellar',
    type: 'movie',
    year: 2014,
    genres: ['Sci-Fi', 'Drama'],
    poster: 'https://picsum.photos/seed/interstellar/300/450',
    backdrop: 'https://picsum.photos/seed/interstellarbg/1280/720',
    rating: 10,
    status: 'completed',
    watchedAt: '2023-10-15',
    runtime: 169,
  },
  {
    id: '11',
    title: 'Vinland Saga',
    type: 'anime',
    year: 2019,
    genres: ['Action', 'Historical', 'Drama'],
    poster: 'https://picsum.photos/seed/vinland/300/450',
    backdrop: 'https://picsum.photos/seed/vinlandbg/1280/720',
    rating: 9,
    status: 'completed',
    episodes: { watched: 48, total: 48 },
    watchedAt: '2023-09-20',
    runtime: 1152,
  },
  {
    id: '12',
    title: 'House of the Dragon',
    type: 'series',
    year: 2022,
    genres: ['Fantasy', 'Drama'],
    poster: 'https://picsum.photos/seed/hotd/300/450',
    backdrop: 'https://picsum.photos/seed/hotdbg/1280/720',
    rating: 8,
    status: 'watching',
    progress: 40,
    episodes: { watched: 14, total: 28 },
    watchedAt: '2024-06-15',
    runtime: 840,
  },
];

// ─── Recommendations ───────────────────────────────────────────────────────
export const recommendations: Recommendation[] = [
  {
    id: 'r1',
    title: 'Silo',
    type: 'series',
    year: 2023,
    genres: ['Sci-Fi', 'Thriller'],
    poster: 'https://picsum.photos/seed/silo/300/450',
    backdrop: 'https://picsum.photos/seed/silobg/1280/720',
    matchScore: 94,
    matchReason: 'Matches your love for cerebral sci-fi (Interstellar, Severance)',
    tmdbRating: 8.2,
    synopsis: 'In the future, thousands live in a giant silo underground, forbidden to venture outside under threat of death.',
  },
  {
    id: 'r2',
    title: 'Parasyte: The Maxim',
    type: 'anime',
    year: 2014,
    genres: ['Sci-Fi', 'Horror', 'Action'],
    poster: 'https://picsum.photos/seed/parasyte/300/450',
    backdrop: 'https://picsum.photos/seed/parasytebg/1280/720',
    matchScore: 91,
    matchReason: 'Based on your top genre: Dark Sci-Fi anime (Attack on Titan, Demon Slayer)',
    tmdbRating: 8.4,
    synopsis: 'Parasitic aliens secretly invade Earth. One bonds with a high school student, setting them on a collision course with others.',
  },
  {
    id: 'r3',
    title: 'Civil War',
    type: 'movie',
    year: 2024,
    genres: ['Action', 'Drama', 'Thriller'],
    poster: 'https://picsum.photos/seed/civilwar/300/450',
    backdrop: 'https://picsum.photos/seed/civilwarbg/1280/720',
    matchScore: 87,
    matchReason: 'High-rated drama with your preferred runtime (90-180 min)',
    tmdbRating: 7.3,
    synopsis: 'A team of journalists travel across the United States during a rapidly escalating civil war.',
  },
  {
    id: 'r4',
    title: 'Frieren: Beyond Journey\'s End',
    type: 'anime',
    year: 2023,
    genres: ['Fantasy', 'Adventure', 'Drama'],
    poster: 'https://picsum.photos/seed/frieren/300/450',
    backdrop: 'https://picsum.photos/seed/frierenbg/1280/720',
    matchScore: 96,
    matchReason: 'Your highest-rated genre pairing: Fantasy + Drama anime',
    tmdbRating: 9.1,
    synopsis: 'The heroic party has defeated the Demon King and is now disbanding. Frieren, the elf mage, reflects on her long life.',
  },
  {
    id: 'r5',
    title: 'Constellation',
    type: 'series',
    year: 2024,
    genres: ['Sci-Fi', 'Thriller', 'Mystery'],
    poster: 'https://picsum.photos/seed/constellation/300/450',
    backdrop: 'https://picsum.photos/seed/constellationbg/1280/720',
    matchScore: 88,
    matchReason: 'Matches your Severance watchlist — psychological thriller + sci-fi',
    tmdbRating: 7.6,
    synopsis: 'An astronaut returns from a space disaster to discover that key pieces of her life seem to be missing.',
  },
  {
    id: 'r6',
    title: 'The Zone of Interest',
    type: 'movie',
    year: 2023,
    genres: ['Drama', 'History'],
    poster: 'https://picsum.photos/seed/zoneofinterest/300/450',
    backdrop: 'https://picsum.photos/seed/zoibg/1280/720',
    matchScore: 82,
    matchReason: 'Based on your Oppenheimer rating — historical drama, awards-acclaimed',
    tmdbRating: 7.4,
    synopsis: 'The commandant of Auschwitz and his wife strive to build a dream life for their family in a house next to the camp.',
  },
];

// ─── Badges ────────────────────────────────────────────────────────────────
export const badges: Badge[] = [
  {
    id: 'b1',
    name: 'First Log',
    description: 'Logged your first title',
    tier: 'bronze',
    icon: '🎬',
    earned: true,
    earnedAt: '2023-09-01',
    rarity: 'Common',
  },
  {
    id: 'b2',
    name: 'Binge Starter',
    description: 'Watched 10 titles',
    tier: 'bronze',
    icon: '📺',
    earned: true,
    earnedAt: '2023-09-15',
    rarity: 'Common',
  },
  {
    id: 'b3',
    name: 'Night Owl',
    description: 'Logged 5 titles after midnight',
    tier: 'bronze',
    icon: '🦉',
    earned: true,
    earnedAt: '2023-10-20',
    rarity: 'Uncommon',
  },
  {
    id: 'b4',
    name: 'Anime Veteran',
    description: 'Completed 50 anime episodes',
    tier: 'silver',
    icon: '⛩️',
    earned: true,
    earnedAt: '2023-11-10',
    rarity: 'Uncommon',
  },
  {
    id: 'b5',
    name: '500 Hours',
    description: 'Accumulated 500 hours watched',
    tier: 'gold',
    icon: '⏱️',
    earned: true,
    earnedAt: '2024-02-28',
    rarity: 'Rare',
  },
  {
    id: 'b6',
    name: 'Binge Master',
    description: 'Completed a series in under 48h',
    tier: 'gold',
    icon: '🔥',
    earned: false,
    rarity: 'Rare',
  },
  {
    id: 'b7',
    name: 'Top Reviewer',
    description: 'Rated 25 titles',
    tier: 'gold',
    icon: '⭐',
    earned: false,
    rarity: 'Rare',
  },
  {
    id: 'b8',
    name: 'Completionist',
    description: 'Completed a full series with 50+ episodes',
    tier: 'platinum',
    icon: '💎',
    earned: true,
    earnedAt: '2023-11-06',
    rarity: 'Legendary',
  },
];

// ─── Activity Feed ─────────────────────────────────────────────────────────
export const activityFeed: ActivityEvent[] = [
  { id: 'a1', type: 'rated', title: 'Shogun', rating: 10, timestamp: '2h ago', icon: '⭐' },
  { id: 'a2', type: 'completed', title: 'Demon Slayer: Kimetsu no Yaiba', timestamp: '1d ago', icon: '✅' },
  { id: 'a3', type: 'badge', badgeName: '500 Hours', timestamp: '3d ago', icon: '🏆' },
  { id: 'a4', type: 'started', title: 'House of the Dragon', timestamp: '5d ago', icon: '▶️' },
  { id: 'a5', type: 'rated', title: 'Oppenheimer', rating: 8, timestamp: '1w ago', icon: '⭐' },
  { id: 'a6', type: 'added', title: 'Severance', timestamp: '1w ago', icon: '🔖' },
];

// ─── Profile Stats ─────────────────────────────────────────────────────────
export const profileStats = {
  username: 'shreyas_dev',
  displayName: 'Shreyas',
  avatarUrl: 'https://picsum.photos/seed/avatar/128/128',
  totalTitles: 47,
  totalHours: 623,
  completedTitles: 38,
  avgRating: 8.4,
  currentRank: 142,
  percentile: 94,
  topGenres: [
    { name: 'Sci-Fi', score: 87 },
    { name: 'Drama', score: 74 },
    { name: 'Anime', score: 68 },
    { name: 'Thriller', score: 55 },
    { name: 'Action', score: 48 },
  ],
};
