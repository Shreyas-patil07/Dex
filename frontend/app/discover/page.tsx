"use client";

import { useState } from "react";
import { Zap, Star, ChevronRight, Info, TrendingUp, Filter } from "lucide-react";
import { recommendations, watchList } from "@/lib/mock-data";
import type { ContentType, Recommendation } from "@/lib/mock-data";

// ─── Match Score Ring ─────────────────────────────────────────────────────
// microinteraction: visual feedback that communicates taste-match clearly
function MatchRing({ score }: { score: number }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  const color =
    score >= 90 ? "var(--accent-teal)" :
    score >= 75 ? "var(--accent-primary-soft)" :
    "var(--accent-gold)";

  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={28} cy={28} r={r}
          stroke="var(--bg-border)"
          strokeWidth={3}
          fill="none"
        />
        {/* Fill */}
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
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: color,
        }}
      >
        {score}%
      </span>
    </div>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────
function RecCard({ rec, featured = false }: { rec: Recommendation; featured?: boolean }) {
  const [showReason, setShowReason] = useState(false);

  const typeColor =
    rec.type === "movie" ? "var(--accent-primary)" :
    rec.type === "series" ? "var(--accent-teal)" :
    "var(--accent-gold)";

  const typeLabel =
    rec.type === "movie" ? "🎬 Movie" :
    rec.type === "series" ? "📺 Series" :
    "⛩️ Anime";

  if (featured) {
    return (
      <div
        style={{
          position: "relative",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          height: "420px",
          cursor: "pointer",
        }}
        className="card-hover"
      >
        {/* Backdrop */}
        <img
          src={rec.backdrop}
          alt={rec.title}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(13,17,23,0.95) 0%, rgba(13,17,23,0.6) 60%, transparent 100%)",
          }}
        />
        {/* Content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            padding: "32px",
            maxWidth: "520px",
          }}
        >
          {/* Type + Match */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span
              className="text-label"
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background: `${typeColor}22`,
                color: typeColor,
                border: `1px solid ${typeColor}44`,
              }}
            >
              {typeLabel}
            </span>
            <MatchRing score={rec.matchScore} />
          </div>

          <h2
            className="text-h1"
            style={{ color: "var(--text-primary)", marginBottom: "10px", lineHeight: 1.15 }}
          >
            {rec.title}
          </h2>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
              lineHeight: 1.6,
              marginBottom: "20px",
              // web-typography: cap description at readable width
              maxWidth: "420px",
            }}
          >
            {rec.synopsis}
          </p>

          {/* Match reason pill — microinteraction: info trigger → reason feedback */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              cursor: "pointer",
              marginBottom: "20px",
              transition: "var(--transition-fast)",
            }}
            onClick={() => setShowReason(!showReason)}
          >
            <Zap size={14} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
            <span className="text-small" style={{ color: "var(--accent-primary-soft)" }}>
              {showReason ? rec.matchReason : "Why this is for you"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-primary">
              <ChevronRight size={16} strokeWidth={1.5} />
              Add to List
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Star size={14} strokeWidth={1.5} style={{ color: "var(--accent-gold)", fill: "var(--accent-gold)" }} />
              <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                {rec.tmdbRating} TMDB
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard card
  return (
    <div
      className="glass-card card-hover"
      style={{
        display: "flex",
        gap: "16px",
        padding: "16px",
        cursor: "pointer",
        borderLeft: `3px solid ${typeColor}`,
      }}
    >
      {/* Poster */}
      <div
        style={{
          width: "72px",
          flexShrink: 0,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          aspectRatio: "2/3",
        }}
      >
        <img
          src={rec.poster}
          alt={rec.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <h3
            className="text-h3"
            style={{
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {rec.title}
          </h3>
          <MatchRing score={rec.matchScore} />
        </div>

        <p className="text-small" style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>
          {rec.year} · {rec.genres.slice(0, 2).join(", ")}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(124,58,237,0.10)",
            border: "1px solid rgba(124,58,237,0.2)",
            width: "fit-content",
          }}
        >
          <Info size={11} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
          <span style={{ fontSize: "0.7rem", color: "var(--accent-primary-soft)" }}>
            {rec.matchReason}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Tab ───────────────────────────────────────────────────────────
function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 18px",
        borderRadius: "var(--radius-full)",
        border: active ? "1px solid rgba(124,58,237,0.5)" : "1px solid var(--bg-border)",
        background: active ? "rgba(124,58,237,0.15)" : "transparent",
        color: active ? "var(--accent-primary-soft)" : "var(--text-secondary)",
        fontWeight: active ? 600 : 400,
        fontSize: "var(--text-small)",
        cursor: "pointer",
        // Emil: fast 150ms for frequent filter toggles
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Trending Section ─────────────────────────────────────────────────────
// Uses watch list entries (completed with high ratings)
function TrendingSection() {
  const trending = watchList
    .filter((e) => e.rating && e.rating >= 8 && e.status === "completed")
    .slice(0, 4);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <TrendingUp size={16} strokeWidth={1.5} style={{ color: "var(--accent-gold)" }} />
        <span className="text-h3" style={{ color: "var(--text-primary)" }}>
          Trending in your genres
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
      >
        {trending.map((entry) => (
          <div key={entry.id} className="poster-card" style={{ aspectRatio: "2/3" }}>
            <img
              src={entry.poster}
              alt={entry.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div className="overlay" />
            <div className="meta">
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <Star
                  size={10}
                  strokeWidth={1.5}
                  style={{ color: "var(--accent-gold)", fill: "var(--accent-gold)" }}
                />
                <span style={{ fontSize: "0.65rem", color: "var(--accent-gold)" }}>
                  {entry.rating}/10
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | ContentType>("all");

  const filtered =
    activeFilter === "all"
      ? recommendations
      : recommendations.filter((r) => r.type === activeFilter);

  const [hero, ...rest] = filtered;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "32px 24px 80px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
        className="fade-in"
      >
        <div>
          <p className="text-label" style={{ color: "var(--accent-primary-soft)", marginBottom: "6px" }}>
            Powered by your taste vector
          </p>
          <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>
            Discover
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={14} strokeWidth={1.5} style={{ color: "var(--text-secondary)" }} />
          <span className="text-small" style={{ color: "var(--text-secondary)" }}>
            Filter:
          </span>
        </div>
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "28px",
          overflowX: "auto",
          paddingBottom: "4px",
          flexWrap: "wrap",
        }}
        className="fade-in"
      >
        {(["all", "movie", "series", "anime"] as const).map((f) => (
          <FilterTab
            key={f}
            label={
              f === "all" ? "All" :
              f === "movie" ? "🎬 Movies" :
              f === "series" ? "📺 Series" :
              "⛩️ Anime"
            }
            active={activeFilter === f}
            onClick={() => setActiveFilter(f)}
          />
        ))}
      </div>

      {/* ── Featured Hero Recommendation ──────────────────────────── */}
      {hero && (
        <div style={{ marginBottom: "32px" }} className="fade-in">
          <RecCard rec={hero} featured />
        </div>
      )}

      {/* ── Recommendation List ───────────────────────────────────── */}
      {rest.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Zap size={16} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
            <h2 className="text-h3" style={{ color: "var(--text-primary)" }}>
              More picks for you
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "12px",
            }}
          >
            {rest.map((rec, i) => (
              <div
                key={rec.id}
                style={{ animation: `staggerIn 0.4s ease ${i * 0.07}s both` }}
              >
                <RecCard rec={rec} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trending ─────────────────────────────────────────────── */}
      <TrendingSection />
    </div>
  );
}
