"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  List,
  User,
  Zap,
} from "lucide-react";

// Note: nav items match the 4 pages in the design.
// Using Lucide icons per style guide §12 — stroke-based, 1.5 stroke width.
const navItems = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/list",     label: "My List",  icon: List },
  { href: "/profile",  label: "Profile",  icon: User },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "16rem",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--bg-border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          // Malewicz: surface elevation via slight lightening, not just shadow
          boxShadow: "1px 0 0 var(--glass-border)",
        }}
        className="hidden md:flex"
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "24px 20px",
            borderBottom: "1px solid var(--bg-border)",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "var(--gradient-purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
              flexShrink: 0,
            }}
          >
            D
          </span>
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            Dex
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent-primary-soft)",
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "2px 6px",
            }}
          >
            Beta
          </span>
        </Link>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "12px 12px" }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "4px",
                  textDecoration: "none",
                  // Emil: fast 150ms for frequent nav actions
                  transition: "background 0.15s ease, color 0.15s ease",
                  background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                  color: isActive ? "var(--accent-primary-soft)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "var(--text-body)",
                  borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
                }}
                className="nav-link"
              >
                <Icon size={18} strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User quick-info at bottom */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--bg-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <img
            src="https://picsum.photos/seed/avatar/128/128"
            alt="Avatar"
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              objectFit: "cover",
              border: "2px solid var(--accent-primary)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "var(--text-small)",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              shreyas_dev
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              47 titles · 623h
            </p>
          </div>
          <Zap
            size={16}
            strokeWidth={1.5}
            style={{ color: "var(--accent-gold)", flexShrink: 0 }}
          />
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────── */}
      {/* Per style guide §14: bottom navigation bar replaces sidebar on mobile */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60px",
          background: "rgba(22, 27, 34, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--bg-border)",
          display: "flex",
          alignItems: "center",
          zIndex: 50,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        className="md:hidden"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                padding: "8px 4px",
                textDecoration: "none",
                color: isActive ? "var(--accent-primary-soft)" : "var(--text-secondary)",
                transition: "color 0.15s ease",
                // Rauno: Fitts's Law — full flex-1 hit target is important here
                minHeight: "44px",
                justifyContent: "center",
              }}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span style={{ fontSize: "0.65rem", fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
