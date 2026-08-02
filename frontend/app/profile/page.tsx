"use client";

import { useState } from "react";
import {
  Clock,
  Award,
  Star,
  Activity,
  TrendingUp,
  Lock,
  Sparkles,
  PlayCircle,
  CheckCircle,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import { profileStats, badges, activityFeed, watchList } from "@/lib/mock-data";

// ─── Badge Component ──────────────────────────────────────────────────────
function BadgeIcon({
  badge,
}: {
  badge: (typeof badges)[0];
}) {
  const tierConfig = {
    bronze:   { color: "#CD7F32", glow: "rgba(205,127,50,0.4)",   bg: "rgba(205,127,50,0.10)"   },
    silver:   { color: "#C0C0C0", glow: "rgba(192,192,192,0.4)",  bg: "rgba(192,192,192,0.10)"  },
    gold:     { color: "#F59E0B", glow: "rgba(245,158,11,0.5)",   bg: "rgba(245,158,11,0.10)"   },
    platinum: { color: "#A855F7", glow: "rgba(168,85,247,0.5)",   bg: "rgba(168,85,247,0.10)"   },
  }[badge.tier];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "72px" }}
      title={`${badge.name} — ${badge.description}`}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: `2px solid ${badge.earned ? tierConfig.color : "var(--bg-border)"}`,
          background: badge.earned ? tierConfig.bg : "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          // Only earned badges get the glow — Malewicz: visual weight = importance
          boxShadow: badge.earned ? `0 0 16px ${tierConfig.glow}` : "none",
          filter: badge.earned ? "none" : "grayscale(100%) opacity(0.3)",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          cursor: "default",
        }}
        className={badge.earned ? "badge-icon" : ""}
        onMouseEnter={(e) => {
          if (badge.earned) {
            (e.currentTarget as HTMLDivElement).style.transform = "scale(1.1)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${tierConfig.glow}`;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = badge.earned
            ? `0 0 16px ${tierConfig.glow}`
            : "none";
        }}
      >
        {badge.earned ? badge.icon : <Lock size={20} strokeWidth={1.5} />}
      </div>
      <span
        className="text-label"
        style={{
          color: badge.earned ? "var(--text-secondary)" : "var(--text-disabled)",
          textAlign: "center",
          fontSize: "0.6rem",
          lineHeight: 1.3,
        }}
      >
        {badge.name}
      </span>
    </div>
  );
}

// ─── Genre Bar ────────────────────────────────────────────────────────────
function GenreBar({ name, score }: { name: string; score: number }) {
  const color =
    score >= 75 ? "var(--accent-primary-soft)" :
    score >= 50 ? "var(--accent-teal)" :
    "var(--accent-gold)";

  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "5px",
          alignItems: "center",
        }}
      >
        <span className="text-small" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {name}
        </span>
        <span className="text-small" style={{ color: "var(--text-secondary)" }}>
          {score}%
        </span>
      </div>
      <div
        style={{
          height: "5px",
          background: "var(--bg-border)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: `linear-gradient(to right, ${color}, ${color}88)`,
            borderRadius: "var(--radius-full)",
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Activity Event Row ──────────────────────────────────────────────────
function ActivityRow({ event }: { event: (typeof activityFeed)[0] }) {
  const text =
    event.type === "rated"     ? `Rated ${event.title} ${event.rating}/10` :
    event.type === "completed" ? `Completed ${event.title}` :
    event.type === "badge"     ? `Earned badge: ${event.badgeName}` :
    event.type === "started"   ? `Started watching ${event.title}` :
    `Added ${event.title} to watchlist`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: "16px", flexShrink: 0 }}>{event.icon}</span>
      <p className="text-small" style={{ color: "var(--text-secondary)", flex: 1 }}>
        {text}
      </p>
      <span className="text-small" style={{ color: "var(--text-disabled)", flexShrink: 0 }}>
        {event.timestamp}
      </span>
    </div>
  );
}

// ─── Currently Watching Card ─────────────────────────────────────────────
function CurrentlyWatchingCard() {
  const watching = watchList.filter((e) => e.status === "watching");
  if (!watching.length) return null;
  const entry = watching[0];

  return (
    <div
      // §8: Currently Watching gets teal glow pulse
      className="glass-card-active glow-teal"
      style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--accent-teal)",
            animation: "glowPulse 2s ease-in-out infinite",
          }}
        />
        <span className="text-label" style={{ color: "var(--accent-teal)" }}>
          Currently Watching
        </span>
      </div>

      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <img
          src={entry.poster}
          alt={entry.title}
          style={{
            width: "60px",
            height: "88px",
            objectFit: "cover",
            borderRadius: "var(--radius-sm)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            className="text-h3"
            style={{
              color: "var(--text-primary)",
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.title}
          </h3>
          <p className="text-small" style={{ color: "var(--text-secondary)", marginBottom: "10px" }}>
            {entry.episodes
              ? `${entry.episodes.watched}/${entry.episodes.total} episodes`
              : entry.year}
          </p>
          {entry.progress !== undefined && (
            <>
              <div
                style={{
                  height: "4px",
                  background: "rgba(45,212,191,0.2)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${entry.progress}%`,
                    background: "var(--accent-teal)",
                    borderRadius: "var(--radius-full)",
                  }}
                />
              </div>
              <span className="text-small" style={{ color: "var(--accent-teal)" }}>
                {entry.progress}% complete
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Coming Soon Overlay ──────────────────────────────────────────────────
// Applied over interactive sections to communicate "coming soon" state clearly
function ComingSoonOverlay({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Blurred content beneath */}
      <div
        style={{
          filter: "blur(2px)",
          pointerEvents: "none",
          userSelect: "none",
          opacity: 0.6,
          transition: "opacity 0.2s ease",
        }}
      >
        {children}
      </div>

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "var(--radius-lg)",
          background: "rgba(13,17,23,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          border: "1px solid rgba(124,58,237,0.2)",
          transition: "background 0.2s ease",
          ...(hovered && { background: "rgba(13,17,23,0.6)" }),
        }}
      >
        <Sparkles
          size={24}
          strokeWidth={1.5}
          style={{ color: "var(--accent-primary-soft)" }}
        />
        <span
          className="text-label"
          style={{ color: "var(--accent-primary-soft)", letterSpacing: "0.1em" }}
        >
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { displayName, avatarUrl, totalTitles, totalHours, completedTitles, avgRating, currentRank, percentile, topGenres } = profileStats;

  const earnedBadges  = badges.filter((b) => b.earned);
  const pendingBadges = badges.filter((b) => !b.earned);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        paddingBottom: "80px",
      }}
    >
      {/* ── Profile Banner ────────────────────────────────────────── */}
      {/* top-design: immersive banner as architectural hero element */}
      <div
        style={{
          position: "relative",
          height: "240px",
          background: "var(--gradient-hero)",
          overflow: "hidden",
        }}
      >
        {/* Ambient accent blobs — Malewicz: dark mode depth via radial highlights */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-40px",
            left: "20%",
            width: "400px",
            height: "300px",
            background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-20px",
            right: "10%",
            width: "300px",
            height: "200px",
            background: "radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        {/* Coming Soon banner strip */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "var(--radius-full)",
            background: "rgba(124,58,237,0.2)",
            border: "1px solid rgba(124,58,237,0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Sparkles size={14} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
          <span className="text-label" style={{ color: "var(--accent-primary-soft)" }}>
            Profile · Coming Soon
          </span>
        </div>

        {/* Avatar + name overlapping banner bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            left: "32px",
            display: "flex",
            alignItems: "flex-end",
            gap: "16px",
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={avatarUrl}
              alt={`${displayName}'s avatar`}
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "var(--radius-full)",
                objectFit: "cover",
                border: "4px solid var(--bg-base)",
                // Malewicz: elevated element gets highlight border, not just shadow
                boxShadow: "0 0 0 2px var(--accent-primary), 0 4px 20px rgba(0,0,0,0.5)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "var(--accent-teal)",
                border: "2px solid var(--bg-base)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Identity Row ─────────────────────────────────────────── */}
      <div
        style={{
          padding: "56px 32px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            className="text-h1"
            style={{ color: "var(--text-primary)", marginBottom: "4px" }}
          >
            {displayName}
          </h1>
          <p className="text-small" style={{ color: "var(--text-secondary)" }}>
            @shreyas_dev · Member since Sep 2023
          </p>
        </div>

        {/* Rank badge */}
        <div
          className="glass-card-featured"
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <TrendingUp size={20} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
          <div>
            <p
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--accent-primary-soft)",
                letterSpacing: "-0.02em",
              }}
            >
              #{currentRank}
            </p>
            <p className="text-small" style={{ color: "var(--text-secondary)" }}>
              Top {100 - percentile}% globally
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Bento Grid ───────────────────────────────────────── */}
      <div style={{ padding: "0 24px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Row 1: Currently Watching (wide) + stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Currently Watching — wide */}
          <div style={{ gridColumn: "span 1" }}>
            <CurrentlyWatchingCard />
          </div>

          {/* Hours Watched stat */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Clock size={16} strokeWidth={1.5} style={{ color: "var(--accent-teal)" }} />
              <span className="text-label" style={{ color: "var(--text-secondary)" }}>
                Hours Watched
              </span>
            </div>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                marginBottom: "8px",
              }}
            >
              {totalHours}
            </p>
            <p className="text-small" style={{ color: "var(--text-secondary)" }}>
              ~{Math.floor(totalHours / 24)} days of content
            </p>
          </div>

          {/* Titles Completed stat */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <CheckCircle size={16} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
              <span className="text-label" style={{ color: "var(--text-secondary)" }}>
                Titles Completed
              </span>
            </div>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                marginBottom: "8px",
              }}
            >
              {completedTitles}
            </p>
            <p className="text-small" style={{ color: "var(--text-secondary)" }}>
              of {totalTitles} logged titles
            </p>
          </div>
        </div>

        {/* Row 2: Taste breakdown + Badges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Genre Taste */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Activity size={16} strokeWidth={1.5} style={{ color: "var(--accent-gold)" }} />
              <span className="text-h3" style={{ color: "var(--text-primary)" }}>
                Taste Profile
              </span>
            </div>
            {topGenres.map((g) => (
              <GenreBar key={g.name} name={g.name} score={g.score} />
            ))}
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Star size={12} strokeWidth={1.5} style={{ color: "var(--accent-gold)", fill: "var(--accent-gold)" }} />
              <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                Avg rating: <strong style={{ color: "var(--text-primary)" }}>{avgRating}</strong>
              </span>
            </div>
          </div>

          {/* Badges — Coming Soon overlay on pending ones */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={16} strokeWidth={1.5} style={{ color: "var(--accent-gold)" }} />
                <span className="text-h3" style={{ color: "var(--text-primary)" }}>
                  Badges
                </span>
              </div>
              <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                {earnedBadges.length}/{badges.length} earned
              </span>
            </div>

            {/* Earned */}
            <p className="text-label" style={{ color: "var(--text-secondary)", marginBottom: "14px" }}>
              Earned
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {earnedBadges.map((b) => (
                <BadgeIcon key={b.id} badge={b} />
              ))}
            </div>

            {/* Pending — with Coming Soon overlay */}
            <p className="text-label" style={{ color: "var(--text-secondary)", marginBottom: "14px" }}>
              Locked
            </p>
            <ComingSoonOverlay>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                {pendingBadges.map((b) => (
                  <BadgeIcon key={b.id} badge={b} />
                ))}
              </div>
            </ComingSoonOverlay>
          </div>
        </div>

        {/* Row 3: Activity Feed + Showcase — both Coming Soon overlaid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Top Showcase — Coming Soon */}
          <ComingSoonOverlay>
            <div className="glass-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                <Star size={16} strokeWidth={1.5} style={{ color: "var(--accent-gold)" }} />
                <span className="text-h3" style={{ color: "var(--text-primary)" }}>
                  Top 5 Showcase
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                {watchList
                  .filter((e) => e.rating && e.rating >= 9)
                  .slice(0, 5)
                  .map((e) => (
                    <div key={e.id} className="poster-card" style={{ width: "80px", aspectRatio: "2/3", flexShrink: 0 }}>
                      <img src={e.poster} alt={e.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div className="overlay" />
                    </div>
                  ))}
              </div>
            </div>
          </ComingSoonOverlay>

          {/* Quick stats */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Bookmark size={16} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
              <span className="text-h3" style={{ color: "var(--text-primary)" }}>
                Quick Stats
              </span>
            </div>
            {[
              { label: "Movies",  value: watchList.filter(e => e.type === "movie").length,  icon: "🎬" },
              { label: "Series",  value: watchList.filter(e => e.type === "series").length, icon: "📺" },
              { label: "Anime",   value: watchList.filter(e => e.type === "anime").length,  icon: "⛩️" },
              { label: "Watching",value: watchList.filter(e => e.status === "watching").length, icon: "▶️" },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                  {icon} {label}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontSize: "var(--text-body)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 4: Recent Activity Feed (full width) */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Activity size={16} strokeWidth={1.5} style={{ color: "var(--accent-teal)" }} />
            <span className="text-h3" style={{ color: "var(--text-primary)" }}>
              Recent Activity
            </span>
          </div>
          {activityFeed.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </div>

        {/* ── Full Coming Soon notice ────────────────────────────── */}
        <div
          style={{
            marginTop: "32px",
            borderRadius: "var(--radius-xl)",
            background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(45,212,191,0.06) 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <Sparkles
            size={28}
            strokeWidth={1.5}
            style={{ color: "var(--accent-primary-soft)", marginBottom: "16px" }}
          />
          <h2 className="text-h2" style={{ color: "var(--text-primary)", marginBottom: "10px" }}>
            Full profile pages are coming soon
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              maxWidth: "440px",
              margin: "0 auto 24px",
              lineHeight: 1.7,
            }}
          >
            Public profiles, shareable profile cards, social proof, Taste Twins, and leaderboard integration are all in active development.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/list" className="btn-primary">
              <PlayCircle size={16} strokeWidth={1.5} />
              Build My List
            </a>
            <a href="/discover" className="btn-ghost">
              Discover Picks
              <ChevronRight size={16} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
