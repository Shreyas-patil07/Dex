"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlayCircle,
  Star,
  TrendingUp,
  Award,
  Users,
  Activity,
  Clock,
  ChevronRight,
  Zap,
  BookMarked,
  BarChart3,
} from "lucide-react";

// ─── Animated Counter (microinteraction: visual feedback on stat reveal) ──
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return <>{count.toLocaleString()}{suffix}</>;
}

// ─── Feature card data ────────────────────────────────────────────────────
const features = [
  {
    icon: BarChart3,
    title: "Taste Engine",
    desc: "One vector built from everything you've watched. Negative signal weighted 1.5× for accuracy.",
    accent: "var(--accent-primary-soft)",
    bg: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.2)",
  },
  {
    icon: Zap,
    title: "Smart Recommendations",
    desc: "pgvector cosine similarity, genre pair boosts, and a 15% diversity slice so you never get stuck.",
    accent: "var(--accent-teal)",
    bg: "rgba(45,212,191,0.08)",
    border: "rgba(45,212,191,0.2)",
  },
  {
    icon: Award,
    title: "Badge System",
    desc: "Tiered bronze → platinum. Dynamic rarity from Common to Legendary based on real population data.",
    accent: "var(--accent-gold)",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    icon: TrendingUp,
    title: "Leaderboards",
    desc: "Global + per-country rankings. Quality metric leads, not raw hours. Minimum 20 logs to enter.",
    accent: "var(--accent-primary-soft)",
    bg: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.2)",
  },
  {
    icon: Activity,
    title: "Activity Feed",
    desc: "Badge unlocks, theme shifts, rank changes — a living record of your watching life.",
    accent: "var(--accent-teal)",
    bg: "rgba(45,212,191,0.08)",
    border: "rgba(45,212,191,0.2)",
  },
  {
    icon: BookMarked,
    title: "Plan to Watch",
    desc: "The stickiest feature. Psychological debt keeps you coming back to finish your list.",
    accent: "var(--accent-gold)",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
  },
];

// ─── How it works steps ───────────────────────────────────────────────────
const steps = [
  {
    n: "01",
    title: "Log what you watch",
    desc: "Search the catalog and mark movies, series as watched, watching, or plan to watch. Takes 5 seconds per title.",
    icon: PlayCircle,
  },
  {
    n: "02",
    title: "Build your taste vector",
    desc: "Every log nudges your personal genre affinity model. Rate titles to strengthen the signal.",
    icon: BarChart3,
  },
  {
    n: "03",
    title: "Get recommendations that actually fit",
    desc: "Your vector powers real-time picks with transparent match explanations — no black box.",
    icon: Zap,
  },
];

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        paddingBottom: "80px", // mobile bottom nav clearance
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      {/* top-design: dramatic type as primary structural element, not just a heading */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "40px 24px",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow background — Malewicz: dark mode depth via highlights */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--gradient-hero)",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
            zIndex: 0,
            animation: "ambientPulse 6s ease-in-out infinite",
          }}
        />

        {/* Content */}
        <div
          style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}
          className="fade-in"
        >
          {/* Label — top-design: set the context before the dramatic headline */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              marginBottom: "24px",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "var(--accent-gold)" }}>●</span>
            <span className="text-label" style={{ color: "var(--accent-primary-soft)" }}>
              Now in Beta
            </span>
          </div>

          {/* Headline — top-design: typography as architecture */}
          <h1
            style={{
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              marginBottom: "8px",
            }}
          >
            Your watch history.
          </h1>
          {/* dramatic scale contrast: same size but gradient accent on second line */}
          <h1
            style={{
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
              background: "var(--gradient-purple)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "32px",
            }}
          >
            Your identity.
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              maxWidth: "560px",
              margin: "0 auto 40px",
              // web-typography: 45-75 char line length for body comfort
            }}
          >
            A Steam-style platform for movie, series, and anime watchers.
            Log everything. Discover what&apos;s next. Own your taste.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/list" className="btn-primary" style={{ fontSize: "1rem", padding: "13px 28px" }}>
              <PlayCircle size={18} strokeWidth={1.5} />
              Start Logging
            </Link>
            <Link href="/discover" className="btn-ghost" style={{ fontSize: "1rem", padding: "13px 28px" }}>
              Explore Discover
              <ChevronRight size={18} strokeWidth={1.5} />
            </Link>
          </div>

          {/* Tagline sub-text */}
          <p
            style={{
              marginTop: "24px",
              fontSize: "var(--text-small)",
              color: "var(--text-disabled)",
            }}
          >
            Free to use. No streaming service required.
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            opacity: 0.4,
            animation: "fadeInUp 1s ease 0.8s forwards",
          }}
        >
          <div
            style={{
              width: "1px",
              height: "48px",
              background: "linear-gradient(to bottom, transparent, var(--text-secondary))",
            }}
          />
          <span className="text-label" style={{ color: "var(--text-secondary)" }}>
            Scroll
          </span>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────── */}
      {/* refactoring-ui: dramatic contrast on stats — they're the hero after the tagline */}
      <section
        style={{
          padding: "0 24px 80px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          className="glass-card"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1px",
            overflow: "hidden",
            background: "var(--bg-border)",
          }}
        >
          {[
            { label: "Titles Tracked", value: 50000, suffix: "+", icon: PlayCircle },
            { label: "Hours Logged", value: 2800000, suffix: "+", icon: Clock },
            { label: "Recommendations", value: 95, suffix: "% match rate", icon: Zap },
            { label: "Active Watchers", value: 12000, suffix: "+", icon: Users },
          ].map(({ label, value, suffix, icon: Icon }) => (
            <div
              key={label}
              style={{
                background: "var(--bg-surface)",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <Icon size={20} strokeWidth={1.5} style={{ color: "var(--accent-primary-soft)" }} />
              <span
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <AnimatedCounter target={value} suffix={suffix.startsWith("+") ? "+" : ""} />
                {!suffix.startsWith("+") && suffix}
              </span>
              <span className="text-small" style={{ color: "var(--text-secondary)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 80px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* Section header — top-design: small label sets context for large heading */}
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <p className="text-label" style={{ color: "var(--accent-primary-soft)", marginBottom: "12px" }}>
            Built different
          </p>
          <h2 className="text-h1" style={{ color: "var(--text-primary)", marginBottom: "16px" }}>
            One taste vector. Everything downstream.
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              maxWidth: "500px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Instead of four separate systems guessing independently, Dex derives a single taste model that powers all features.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {features.map(({ icon: Icon, title, desc, accent, bg, border }, i) => (
            <div
              key={title}
              className="card-hover"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: "var(--radius-lg)",
                padding: "28px",
                // Jhey: deliberate, purposeful detail — stagger the fade-in
                animation: `staggerIn 0.4s ease ${i * 0.08}s both`,
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  background: `${bg}`,
                  border: `1px solid ${border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <Icon size={22} strokeWidth={1.5} style={{ color: accent }} />
              </div>
              <h3
                className="text-h3"
                style={{ color: "var(--text-primary)", marginBottom: "8px" }}
              >
                {title}
              </h3>
              <p className="text-small" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 80px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <p className="text-label" style={{ color: "var(--accent-teal)", marginBottom: "12px" }}>
            Simple by design
          </p>
          <h2 className="text-h1" style={{ color: "var(--text-primary)" }}>
            How Dex works
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {steps.map(({ n, title, desc, icon: Icon }, i) => (
            <div
              key={n}
              className="glass-card card-hover"
              style={{
                padding: "32px 28px",
                position: "relative",
                overflow: "hidden",
                animation: `staggerIn 0.5s ease ${i * 0.1}s both`,
              }}
            >
              {/* Large background number — top-design: dramatic scale contrast */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "16px",
                  fontSize: "5rem",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.03)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {n}
              </span>
              <Icon
                size={24}
                strokeWidth={1.5}
                style={{ color: "var(--accent-primary-soft)", marginBottom: "16px" }}
              />
              <h3
                className="text-h2"
                style={{ color: "var(--text-primary)", marginBottom: "10px" }}
              >
                {title}
              </h3>
              <p className="text-small" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            borderRadius: "var(--radius-xl)",
            background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(45,212,191,0.1) 100%)",
            border: "1px solid rgba(124,58,237,0.3)",
            padding: "clamp(40px, 6vw, 64px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-50%",
              right: "-10%",
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <Star
            size={32}
            strokeWidth={1.5}
            style={{ color: "var(--accent-gold)", marginBottom: "20px" }}
          />
          <h2
            className="text-h1"
            style={{
              color: "var(--text-primary)",
              marginBottom: "16px",
              position: "relative",
            }}
          >
            Your cinema room awaits.
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "32px",
              maxWidth: "440px",
              margin: "0 auto 32px",
              lineHeight: 1.7,
            }}
          >
            Start logging your first title — the more you add, the more Dex learns about your taste.
          </p>
          <Link href="/list" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
            <PlayCircle size={18} strokeWidth={1.5} />
            Start for Free
          </Link>
        </div>
      </section>
    </div>
  );
}
