"use client";

import Link from "next/link";

type Props = {
  onLocate: () => void;
};

export default function Header({ onLocate }: Props) {
  return (
    <header className="vambla-map-header">
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }} aria-label="Vambla home">
          <img src="/vambla-icon.png" alt="Vambla" className="vambla-map-header-logo" style={{ height: 38, width: "auto" }} />
        </Link>
        <span className="vambla-map-header-tagline">
          Nearby Wonders — UK &amp; Ireland
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Link href="/" aria-label="Back to Discover home" className="vambla-map-header-link">
          <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="var(--parchment)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12l9-9 9 9M5 10v10h14V10" />
          </svg>
          <span className="vambla-map-header-link-text">Discover</span>
        </Link>
        <Link href="/wishlist" aria-label="Wishlist" className="vambla-map-header-link">
          <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="var(--parchment)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20s-7-4.5-9.5-9C1 8 2 4 6 4c2.3 0 3.7 1.3 6 3.5C14.3 5.3 15.7 4 18 4c4 0 5 4 3.5 7-2.5 4.5-9.5 9-9.5 9z" />
          </svg>
          <span className="vambla-map-header-link-text">Wishlist</span>
        </Link>
        <button onClick={onLocate} aria-label="Find places near me" className="vambla-map-header-cta">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          <span className="vambla-map-header-cta-text">Near me</span>
        </button>
      </div>
    </header>
  );
}
