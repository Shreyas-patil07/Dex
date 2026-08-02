"use client";
import Image from "next/image";

import { useState, useEffect } from "react";
import { Zap, Star, ChevronRight, Info, TrendingUp, Filter, Loader2 } from "lucide-react";
import type { NormalizedMedia } from "../api/tmdb/trending/route";

// ─── Match Score Ring ─────────────────────────────────────────────────────
// Visualises how well a title matches your taste vector.
// Score is derived from TMDB vote_average mapped 0-100 until the real
// taste engine ships — at which point this becomes a real pgvector score.
function MatchRing({ score }: { score: number }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  const color =
    score >= 85 ? "var(--accent-teal)" :
    score >= 70 ? "var(--accent-primary-soft)" :
    "var(--accent-gold)";

  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={28} cy={28} r={r} stroke="var(--bg-border)" strokeWidth={3} fill="none" />
        <circle
          cx={28} cy={28} r={r}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.7rem", fontWeight: 700, color,
      }}>
        {score}%
      </span>
    </div>
  );
}

// ─── Match reason labels ──────────────────────────────────────────────────
// Placeholder until the taste engine backend ships (Phase 2).
// note: these rotate based on genre to feel personalised without a real model.
function matchReason(item: NormalizedMedia): string {
  const g = item.genres[0] ?? "your taste";
  if (item.type === "series") return `Trending series matching your ${g} affinity`;
  if (item.genres.includes("Sci-Fi") || item.genres.includes("Sci-Fi & Fantasy"))
    return "Matches your top genre: Sci-Fi";
  if (item.genres.includes("Drama"))
    return "Strong drama signal in your taste vector";
  if (item.genres.includes("Action"))
    return "Aligns with your action + high-rating pattern";
  return `Trending in ${g} — strong taste vector match`;
}

// Derive a pseudo match-score from TMDB vote_average until backend ships
function toMatchScore(rating: number): number {
  // Map 0-10 → 60-99 so every result feels like a decent pick
  return Math.min(99, Math.round(60 + (rating / 10) * 39));
}

// ─── Hero Recommendation Card ─────────────────────────────────────────────
function HeroCard({ item }: { item: NormalizedMedia }) {
  const [showReason, setShowReason] = useState(false);
  const score = toMatchScore(item.tmdbRating);
  const typeLabel = item.type === "movie" ? "🎬 Movie" : "📺 Series";
  const typeColor = item.type === "movie" ? "var(--accent-primary)" : "var(--accent-teal)";

  return (
    <div
      style={{
        position: "relative", borderRadius: "var(--radius-xl)",
        overflow: "hidden", height: "420px", cursor: "pointer",
      }}
      className="card-hover"
    >
      {/* Real TMDB backdrop — next/image for automatic WebP + optimized LCP */}
      <Image
        src={item.backdrop}
        alt={item.title}
        fill
        style={{ objectFit: "cover" }}
        sizes="(max-width: 768px) 100vw, 1100px"
        priority
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to right, rgba(13,17,23,0.95) 0%, rgba(13,17,23,0.6) 60%, transparent 100%)",
      }} />

      <div style={{ position: "absolute", bottom: 0, left: 0, padding: "32px", maxWidth: "520px" }}>
        {/* Type + Match */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span className="text-label" style={{
            padding: "4px 10px", borderRadius: "var(--radius-sm)",
            background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44`,
          }}>
            {typeLabel}
          </span>
          <MatchRing score={score} />
        </div>

        <h2 className="text-h1" style={{ color: "var(--text-primary)", marginBottom: "10px", lineHeight: 1.15 }}>
          {item.title}
        </h2>

        <p style={{
          color: "var(--text-secondary)", fontSize: "var(--text-body)",
          lineHeight: 1.6, marginBottom: "20px", maxWidth: "420px",
          // Clamp to 3 lines so long overviews don't overflow
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.synopsis}
        </p>

        {/* Why this — microinteraction: toggle on click */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "8px 14px", borderRadius: "var(--radius-md)",
            background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
            cursor: "pointer", marginBottom: "20px", transition: "var(--transition-fast)",
          }}
          onClick={() => setShowReason(!showReason)}
        >
          <Zap size={14} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
          <span className="text-small" style={{ color: "var(--accent-primary-soft)" }}>
            {showReason ? matchReason(item) : "Why this is for you"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-primary">
            <ChevronRight size={16} strokeWidth={1.5} />
            Add to List
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Star size={14} strokeWidth={1.5} style={{ color: "var(--accent-gold)", fill: "var(--accent-gold)" }} />
            <span className="text-small" style={{ color: "var(--text-secondary)" }}>
              {item.tmdbRating} TMDB · {item.year}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Standard Recommendation Card ────────────────────────────────────────
function RecCard({ item }: { item: NormalizedMedia }) {
  const score = toMatchScore(item.tmdbRating);
  const typeColor = item.type === "movie" ? "var(--accent-primary)" : "var(--accent-teal)";

  return (
    <div
      className="glass-card card-hover"
      style={{
        display: "flex", gap: "16px", padding: "16px",
        cursor: "pointer", borderLeft: `3px solid ${typeColor}`,
      }}
    >
      {/* Real TMDB poster */}
      <div style={{
        width: "72px", flexShrink: 0, position: "relative",
        borderRadius: "var(--radius-sm)", overflow: "hidden", aspectRatio: "2/3",
      }}>
        <Image src={item.poster} alt={item.title} fill style={{ objectFit: "cover" }} sizes="72px" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <h3 className="text-h3" style={{
            color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {item.title}
          </h3>
          <MatchRing score={score} />
        </div>

        <p className="text-small" style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>
          {item.year} · {item.genres.slice(0, 2).join(", ")}
        </p>

        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "5px 10px", borderRadius: "var(--radius-sm)",
          background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.2)",
          width: "fit-content",
        }}>
          <Info size={11} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
          <span style={{ fontSize: "0.7rem", color: "var(--accent-primary-soft)" }}>
            {matchReason(item)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Tab ───────────────────────────────────────────────────────────
function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 18px", borderRadius: "var(--radius-full)",
        border: active ? "1px solid rgba(124,58,237,0.5)" : "1px solid var(--bg-border)",
        background: active ? "rgba(124,58,237,0.15)" : "transparent",
        color: active ? "var(--accent-primary-soft)" : "var(--text-secondary)",
        fontWeight: active ? 600 : 400, fontSize: "var(--text-small)",
        cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card" style={{ display: "flex", gap: "16px", padding: "16px" }}>
      <div style={{
        width: "72px", aspectRatio: "2/3", flexShrink: 0,
        borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)",
        animation: "shimmer 1.5s ease infinite",
      }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ height: "16px", width: "70%", background: "var(--bg-elevated)", borderRadius: "4px" }} />
        <div style={{ height: "12px", width: "40%", background: "var(--bg-elevated)", borderRadius: "4px" }} />
        <div style={{ height: "24px", width: "80%", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const [allItems, setAllItems] = useState<NormalizedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "movie" | "series">("all");

  // Fetch real TMDB trending on mount
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/tmdb/trending");
        if (!res.ok) throw new Error("Failed to load recommendations");
        const data = await res.json() as { results: NormalizedMedia[] };
        setAllItems(data.results);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    activeFilter === "all"
      ? allItems
      : allItems.filter((r) => r.type === activeFilter);

  const [hero, ...rest] = filtered;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      padding: "32px 24px 80px", maxWidth: "1100px", margin: "0 auto",
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "28px" }} className="fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <p className="text-label" style={{ color: "var(--accent-primary-soft)" }}>
            Powered by TMDB · Updated weekly
          </p>
          {loading && <Loader2 size={12} strokeWidth={1.5} style={{ color: "var(--text-secondary)", animation: "spin 1s linear infinite" }} />}
        </div>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>Discover</h1>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }} className="fade-in">
        {(["all", "movie", "series"] as const).map((f) => (
          <FilterTab
            key={f}
            label={f === "all" ? "All" : f === "movie" ? "🎬 Movies" : "📺 Series"}
            active={activeFilter === f}
            onClick={() => setActiveFilter(f)}
          />
        ))}
      </div>

      {/* ── Error state ────────────────────────────────────── */}
      {error && (
        <div className="glass-card" style={{ padding: "32px", textAlign: "center", marginBottom: "24px" }}>
          <p style={{ color: "var(--text-danger)" }}>⚠ {error}</p>
          <p className="text-small" style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            Check that TMDB_READ_TOKEN is set correctly.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────── */}
      {loading && (
        <>
          {/* Hero skeleton */}
          <div style={{
            height: "420px", borderRadius: "var(--radius-xl)",
            background: "var(--bg-elevated)", marginBottom: "32px",
            animation: "shimmer 1.5s ease infinite",
          }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>
      )}

      {/* ── Hero Card (real TMDB data) ─────────────────────── */}
      {!loading && hero && (
        <div style={{ marginBottom: "32px" }} className="fade-in">
          <HeroCard item={hero} />
        </div>
      )}

      {/* ── Recommendations Grid ────────────────────────────── */}
      {!loading && rest.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Zap size={16} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
            <h2 className="text-h3" style={{ color: "var(--text-primary)" }}>
              Trending this week
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "12px",
          }}>
            {rest.map((item, i) => (
              <div key={item.id} style={{ animation: `staggerIn 0.4s ease ${i * 0.07}s both` }}>
                <RecCard item={item} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trending Poster Grid ────────────────────────────── */}
      {!loading && allItems.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <TrendingUp size={16} strokeWidth={1.5} style={{ color: "var(--accent-gold)" }} />
            <h2 className="text-h3" style={{ color: "var(--text-primary)" }}>
              Poster view
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "12px",
          }}>
            {allItems.slice(0, 8).map((item) => (
              <div key={item.id} className="poster-card" style={{ aspectRatio: "2/3", position: "relative" }}>
                <Image src={item.poster} alt={item.title} fill style={{ objectFit: "cover" }} sizes="120px" />
                <div className="overlay" />
                <div className="meta">
                  <p style={{
                    fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "2px" }}>
                    <Star size={9} strokeWidth={1.5} style={{ color: "var(--accent-gold)", fill: "var(--accent-gold)" }} />
                    <span style={{ fontSize: "0.6rem", color: "var(--accent-gold)" }}>{item.tmdbRating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: "64px", textAlign: "center" }}>
          <Filter size={32} strokeWidth={1} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <p className="text-h3" style={{ color: "var(--text-secondary)" }}>
            No {activeFilter} titles in this week&apos;s trending
          </p>
        </div>
      )}

      {/* TMDB attribution — required by TMDB ToS */}
      <p className="text-small" style={{
        color: "var(--text-disabled)", marginTop: "40px", textAlign: "center",
      }}>
        Data from <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-secondary)", textDecoration: "underline" }}
        >
          TMDB
        </a>. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  );
}
