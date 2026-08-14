"use client";

import { useState } from "react";
import FilterChips from "./FilterChips";

type Props = {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  userLoc: { lat: number; lng: number } | null;
  onClearLocation: () => void;
};

// Only rendered/visible on mobile (see .vambla-mobile-map-controls in
// globals.css) - on desktop the sidebar is always visible alongside the
// map, so this would be redundant there.
export default function MobileMapControls({
  searchValue, onSearchChange, onSearchSubmit,
  categories, activeCategory, onSelectCategory,
  userLoc, onClearLocation,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="vambla-mobile-map-controls">
      <div style={{ display: "flex", gap: 8 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}
          style={{ flex: 1 }}
        >
          <label htmlFor="mobile-map-search" className="vambla-visually-hidden">
            Search, or try &quot;category in location&quot;
          </label>
          <input
            id="mobile-map-search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search, or 'castles in York'…"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, border: "none",
              fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none",
              boxShadow: "0 2px 8px rgba(28,37,48,.25)",
            }}
          />
        </form>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          aria-label="Toggle category filters"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 14px", borderRadius: 8, border: "none",
            background: activeCategory !== "All" ? "var(--ochre)" : "#fff",
            color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(28,37,48,.25)", whiteSpace: "nowrap",
          }}
        >
          Filters {activeCategory !== "All" ? "•" : ""}
        </button>
      </div>

      {/* Shown whenever a location search / "near me" is active, so it's
          always easy to back out of it and return to free map browsing -
          this was previously only possible from the sidebar, which is
          hidden while viewing the map on mobile. */}
      {userLoc && (
        <button
          onClick={onClearLocation}
          style={{
            marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--ink)", color: "var(--parchment)", border: "none",
            borderRadius: 20, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(28,37,48,.25)",
          }}
        >
          ✕ Clear location search
        </button>
      )}

      {filtersOpen && (
        <div style={{ marginTop: 8, background: "#fff", borderRadius: 10, boxShadow: "0 4px 14px rgba(28,37,48,.3)", maxHeight: "50vh", overflowY: "auto" }}>
          <FilterChips
            categories={categories}
            active={activeCategory}
            onSelect={(cat) => { onSelectCategory(cat); setFiltersOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}
