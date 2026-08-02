"use client";

import { useState, useMemo } from "react";
import {
  Star,
  Clock,
  CheckCircle,
  PlayCircle,
  Bookmark,
  XCircle,
  LayoutGrid,
  List,
  Filter,
  Search,
  SortAsc,
} from "lucide-react";
import { watchList, profileStats } from "@/lib/mock-data";
import type { WatchStatus, ContentType } from "@/lib/mock-data";

// ─── Status Pill ────────────────────────────────────────────────────────
function StatusPill({ status }: { status: WatchStatus }) {
  const config = {
    watching:  { label: "Watching",        cls: "status-watching",  icon: PlayCircle },
    completed: { label: "Completed",       cls: "status-completed", icon: CheckCircle },
    planned:   { label: "Plan to Watch",   cls: "status-planned",   icon: Bookmark },
    dropped:   { label: "Dropped",         cls: "status-dropped",   icon: XCircle },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={config.cls}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      <Icon size={11} strokeWidth={1.5} />
      {config.label}
    </span>
  );
}

// ─── Star Rating (read-only) ─────────────────────────────────────────────
// §8 Star Rating — gold filled, dark empty, hover scale (Rauno: physically correct)
function StarRating({ rating }: { rating: number | null }) {
  if (!rating) {
    return (
      <span className="text-small" style={{ color: "var(--text-disabled)" }}>
        —
      </span>
    );
  }
  const stars = Math.round(rating / 2); // 10-point scale → 5 stars
  return (
    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          strokeWidth={1.5}
          style={{
            color: i < stars ? "var(--accent-gold)" : "var(--bg-border)",
            fill: i < stars ? "var(--accent-gold)" : "transparent",
          }}
        />
      ))}
      <span className="text-small" style={{ color: "var(--text-secondary)", marginLeft: "4px" }}>
        {rating}/10
      </span>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      style={{
        height: "4px",
        background: "var(--bg-border)",
        borderRadius: "var(--radius-full)",
        overflow: "hidden",
        width: "80px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--accent-teal)",
          borderRadius: "var(--radius-full)",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({
  value,
  label,
  icon: Icon,
  accent,
}: {
  value: string | number;
  label: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        // Malewicz: visual weight matches functional importance — stats are prominent
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "var(--radius-md)",
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} strokeWidth={1.5} style={{ color: accent }} />
      </div>
      <div>
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
        <p className="text-small" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Grid Entry Card ─────────────────────────────────────────────────────
function GridCard({ entry }: { entry: typeof watchList[0] }) {
  const typeBorderColor =
    entry.type === "movie" ? "var(--accent-primary)" :
    entry.type === "series" ? "var(--accent-teal)" :
    "var(--accent-gold)";

  return (
    <div
      className="glass-card card-hover"
      style={{
        overflow: "hidden",
        borderTop: `3px solid ${typeBorderColor}`,
        cursor: "pointer",
      }}
    >
      {/* Poster */}
      <div style={{ aspectRatio: "16/9", overflow: "hidden", position: "relative" }}>
        <img
          src={entry.backdrop}
          alt={entry.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, var(--bg-elevated) 0%, transparent 60%)",
          }}
        />
        {/* Status pill over backdrop */}
        <div style={{ position: "absolute", bottom: "10px", left: "10px" }}>
          <StatusPill status={entry.status} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
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
          {entry.year} ·{" "}
          {entry.type === "movie" ? "🎬 Movie" :
           entry.type === "series" ? "📺 Series" : "⛩️ Anime"}
        </p>

        {entry.progress !== undefined && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                {entry.episodes ? `${entry.episodes.watched}/${entry.episodes.total} eps` : `Progress`}
              </span>
              <span className="text-small" style={{ color: "var(--accent-teal)" }}>
                {entry.progress}%
              </span>
            </div>
            <ProgressBar progress={entry.progress} />
          </div>
        )}

        <StarRating rating={entry.rating} />
      </div>
    </div>
  );
}

// ─── Table Row ───────────────────────────────────────────────────────────
function TableRow({ entry }: { entry: typeof watchList[0] }) {
  const typeBorderColor =
    entry.type === "movie" ? "var(--accent-primary)" :
    entry.type === "series" ? "var(--accent-teal)" :
    "var(--accent-gold)";

  const typeEmoji =
    entry.type === "movie" ? "🎬" :
    entry.type === "series" ? "📺" : "⛩️";

  return (
    <tr
      style={{
        borderBottom: "1px solid var(--bg-border)",
        transition: "background 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
      }}
    >
      {/* Poster thumbnail */}
      <td style={{ padding: "12px 16px", width: "60px" }}>
        <div
          style={{
            width: "40px",
            height: "56px",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            borderLeft: `3px solid ${typeBorderColor}`,
          }}
        >
          <img
            src={entry.poster}
            alt={entry.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </td>

      {/* Title */}
      <td style={{ padding: "12px 8px" }}>
        <p
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            fontSize: "var(--text-body)",
            marginBottom: "2px",
          }}
        >
          {entry.title}
        </p>
        <p className="text-small" style={{ color: "var(--text-secondary)" }}>
          {entry.year}
        </p>
      </td>

      {/* Type badge */}
      <td style={{ padding: "12px 8px" }}>
        <span className="text-small" style={{ color: "var(--text-secondary)" }}>
          {typeEmoji} {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: "12px 8px" }}>
        <StatusPill status={entry.status} />
      </td>

      {/* Progress/Episodes */}
      <td style={{ padding: "12px 8px" }}>
        {entry.status === "watching" && entry.progress !== undefined ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ProgressBar progress={entry.progress} />
            <span className="text-small" style={{ color: "var(--accent-teal)" }}>
              {entry.progress}%
            </span>
          </div>
        ) : entry.episodes ? (
          <span className="text-small" style={{ color: "var(--text-secondary)" }}>
            {entry.episodes.watched}/{entry.episodes.total} eps
          </span>
        ) : (
          <span className="text-small" style={{ color: "var(--text-disabled)" }}>—</span>
        )}
      </td>

      {/* Rating */}
      <td style={{ padding: "12px 8px" }}>
        <StarRating rating={entry.rating} />
      </td>

      {/* Runtime */}
      <td style={{ padding: "12px 16px 12px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={12} strokeWidth={1.5} style={{ color: "var(--text-disabled)" }} />
          <span className="text-small" style={{ color: "var(--text-secondary)" }}>
            {entry.runtime > 0 ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m` : "—"}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ListPage() {
  const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ContentType | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return watchList.filter((e) => {
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchType   = typeFilter === "all"   || e.type   === typeFilter;
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchType && matchSearch;
    });
  }, [statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const completed  = watchList.filter((e) => e.status === "completed").length;
    const watching   = watchList.filter((e) => e.status === "watching").length;
    const planned    = watchList.filter((e) => e.status === "planned").length;
    const totalHours = Math.floor(watchList.reduce((a, e) => a + e.runtime, 0) / 60);
    const rated      = watchList.filter((e) => e.rating);
    const avgRating  =
      rated.length > 0
        ? (rated.reduce((a, e) => a + (e.rating ?? 0), 0) / rated.length).toFixed(1)
        : "—";
    return { completed, watching, planned, totalHours, avgRating, total: watchList.length };
  }, []);

  const statusTabs: { value: WatchStatus | "all"; label: string }[] = [
    { value: "all",       label: `All (${watchList.length})` },
    { value: "watching",  label: `Watching (${stats.watching})` },
    { value: "completed", label: `Completed (${stats.completed})` },
    { value: "planned",   label: `Plan to Watch (${stats.planned})` },
    { value: "dropped",   label: `Dropped (${watchList.filter(e => e.status === "dropped").length})` },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "32px 24px 80px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: "28px" }} className="fade-in">
        <p className="text-label" style={{ color: "var(--accent-primary-soft)", marginBottom: "6px" }}>
          Your cinema library
        </p>
        <h1 className="text-h1" style={{ color: "var(--text-primary)" }}>
          My List
        </h1>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────────── */}
      {/* refactoring-ui: stats are most important, highest visual weight */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
        className="fade-in"
      >
        <StatCard value={stats.total}     label="Total Titles"    icon={Bookmark}    accent="var(--accent-primary-soft)" />
        <StatCard value={`${stats.totalHours}h`} label="Hours Watched" icon={Clock}   accent="var(--accent-teal)" />
        <StatCard value={stats.completed} label="Completed"       icon={CheckCircle} accent="var(--accent-primary-soft)" />
        <StatCard value={stats.avgRating} label="Avg Rating"      icon={Star}        accent="var(--accent-gold)" />
      </div>

      {/* ── Filters & Controls ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "20px",
        }}
        className="fade-in"
      >
        {/* Status tabs */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", flexWrap: "wrap" }}>
          {statusTabs.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                padding: "7px 16px",
                borderRadius: "var(--radius-full)",
                border: statusFilter === value
                  ? "1px solid rgba(124,58,237,0.5)"
                  : "1px solid var(--bg-border)",
                background: statusFilter === value
                  ? "rgba(124,58,237,0.15)"
                  : "transparent",
                color: statusFilter === value
                  ? "var(--accent-primary-soft)"
                  : "var(--text-secondary)",
                fontWeight: statusFilter === value ? 600 : 400,
                fontSize: "var(--text-small)",
                cursor: "pointer",
                transition: "all 0.15s ease", // Emil: fast on frequent filter toggles
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Row 2: type filter + search + view toggle */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Type filter */}
          {(["all", "movie", "series", "anime"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: typeFilter === t
                  ? "1px solid var(--bg-border)"
                  : "1px solid transparent",
                background: typeFilter === t ? "var(--bg-elevated)" : "transparent",
                color: typeFilter === t ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "var(--text-small)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t === "all" ? "All types" :
               t === "movie" ? "🎬 Movies" :
               t === "series" ? "📺 Series" : "⛩️ Anime"}
            </button>
          ))}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              minWidth: "200px",
              // focus ring handled via outline
            }}
          >
            <Search size={14} strokeWidth={1.5} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search your list..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search watch list"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "var(--text-small)",
                width: "100%",
              }}
            />
          </div>

          {/* View toggle — microinteraction: clear trigger + fast visual feedback */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            {([
              { mode: "table" as const, icon: List },
              { mode: "grid"  as const, icon: LayoutGrid },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={`${mode} view`}
                style={{
                  padding: "8px 12px",
                  background: viewMode === mode ? "var(--bg-elevated)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: viewMode === mode ? "var(--accent-primary-soft)" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Icon size={16} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results count ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <SortAsc size={14} strokeWidth={1.5} style={{ color: "var(--text-secondary)" }} />
        <span className="text-small" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} title{filtered.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </span>
      </div>

      {/* ── Content: Table or Grid ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: "64px",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <Filter size={32} strokeWidth={1} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <p className="text-h3" style={{ color: "var(--text-secondary)" }}>
            No titles match your filters
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {filtered.map((entry, i) => (
            <div
              key={entry.id}
              style={{ animation: `staggerIn 0.35s ease ${i * 0.05}s both` }}
            >
              <GridCard entry={entry} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="glass-card"
          style={{ overflow: "hidden" }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-border)" }}>
                {["", "Title", "Type", "Status", "Progress", "Rating", "Runtime"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 8px",
                      textAlign: "left",
                      fontSize: "var(--text-label)",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: "1px solid var(--bg-border)",
                    animation: `staggerIn 0.3s ease ${i * 0.04}s both`,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  {/* Poster */}
                  <td style={{ padding: "12px 16px", width: "60px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "56px",
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        borderLeft: `3px solid ${
                          entry.type === "movie" ? "var(--accent-primary)" :
                          entry.type === "series" ? "var(--accent-teal)" :
                          "var(--accent-gold)"
                        }`,
                      }}
                    >
                      <img
                        src={entry.poster}
                        alt={entry.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </td>
                  {/* Title */}
                  <td style={{ padding: "12px 8px" }}>
                    <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--text-body)", marginBottom: "2px" }}>
                      {entry.title}
                    </p>
                    <p className="text-small" style={{ color: "var(--text-secondary)" }}>{entry.year}</p>
                  </td>
                  {/* Type */}
                  <td style={{ padding: "12px 8px" }}>
                    <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                      {entry.type === "movie" ? "🎬 Movie" : entry.type === "series" ? "📺 Series" : "⛩️ Anime"}
                    </span>
                  </td>
                  {/* Status */}
                  <td style={{ padding: "12px 8px" }}><StatusPill status={entry.status} /></td>
                  {/* Progress */}
                  <td style={{ padding: "12px 8px" }}>
                    {entry.status === "watching" && entry.progress !== undefined ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ProgressBar progress={entry.progress} />
                        <span className="text-small" style={{ color: "var(--accent-teal)" }}>{entry.progress}%</span>
                      </div>
                    ) : entry.episodes ? (
                      <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                        {entry.episodes.watched}/{entry.episodes.total} eps
                      </span>
                    ) : (
                      <span className="text-small" style={{ color: "var(--text-disabled)" }}>—</span>
                    )}
                  </td>
                  {/* Rating */}
                  <td style={{ padding: "12px 8px" }}><StarRating rating={entry.rating} /></td>
                  {/* Runtime */}
                  <td style={{ padding: "12px 16px 12px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} strokeWidth={1.5} style={{ color: "var(--text-disabled)" }} />
                      <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                        {entry.runtime > 0 ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m` : "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
