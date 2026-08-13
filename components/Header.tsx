"use client";

import Link from "next/link";

type Props = {
  onLocate: () => void;
};

export default function Header({ onLocate }: Props) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 22px",
        background: "var(--ink)",
        borderBottom: "3px solid var(--ochre)",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1
            style={{
              fontFamily: "'Bitter', serif",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: 4,
              color: "var(--parchment)",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Vambla
          </h1>
        </Link>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            color: "var(--ochre)",
            textTransform: "uppercase",
          }}
        >
          Nearby Wonders — UK &amp; Ireland
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/"
          aria-label="Back to Discover home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--parchment)",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Discover
        </Link>
        <Link
          href="/wishlist"
          style={{
            color: "var(--parchment)",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ♡ Wishlist
        </Link>
        <button
          onClick={onLocate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--ochre)",
            color: "var(--ink)",
            border: "none",
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "10px 16px",
            borderRadius: 2,
            cursor: "pointer",
          }}
        >
          Find what&apos;s near me
        </button>
      </div>
    </header>
  );
}
