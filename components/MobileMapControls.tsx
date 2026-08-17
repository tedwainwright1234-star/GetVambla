"use client";

import { useEffect, useRef, useState } from "react";
import FilterChips from "./FilterChips";
import ActiveFilters from "./ActiveFilters";

type Props = {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: (value: string) => void;
  categories: string[]; // all selectable categories, for the picker
  activeCategories: string[]; // currently selected (multi-select)
  onToggleCategory: (cat: string) => void;
  locationLabel: string | null;
  radiusMiles: number | null;
  onChangeRadius: (miles: number | null) => void;
  onClearLocation: () => void;
  focusedPlaceName?: string | null;
  onClearFocusedPlace?: () => void;
  searchError?: string | null;
};

// Only rendered/visible on mobile (see .vambla-mobile-map-controls in
// globals.css) - on desktop the sidebar is always visible alongside the
// map, so this would be redundant there.
export default function MobileMapControls({
  searchValue, onSearchChange, onSearchSubmit,
  categories, activeCategories, onToggleCategory,
  locationLabel, radiusMiles, onChangeRadius, onClearLocation,
  focusedPlaceName, onClearFocusedPlace, searchError,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Local, instantly-responsive input buffer - see SearchBar.tsx for why:
  // pushing every keystroke straight into Explorer's state used to
  // re-render the whole map/marker tree while typing, which is what made
  // the mobile search feel sluggish. Now typing only touches local state;
  // the parent hears about it on a short debounce, and Enter always uses
  // the freshest text immediately.
  const [local, setLocal] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(searchValue);
  }, [searchValue]);

  function handleChange(next: string) {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(next), 250);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearchChange(local);
    onSearchSubmit(local);
  }

  return (
    <div className="vambla-mobile-map-controls">
      <div style={{ display: "flex", gap: 8 }}>
        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          <label htmlFor="mobile-map-search" className="vambla-visually-hidden">
            Search, or try &quot;category in location&quot;
          </label>
          <input
            id="mobile-map-search"
            value={local}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search for your next adventure…"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, border: "none",
              fontSize: 16, fontFamily: "'Inter', sans-serif", outline: "none",
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
            background: activeCategories.length > 0 ? "var(--ochre)" : "#fff",
            color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(28,37,48,.25)", whiteSpace: "nowrap",
          }}
        >
          Filters {activeCategories.length > 0 ? `(${activeCategories.length})` : ""}
        </button>
      </div>

      {searchError && (
        <p style={{ margin: "6px 2px 0", fontSize: 12, fontFamily: "'Nunito', sans-serif", color: "#fff", background: "rgba(28,37,48,.85)", padding: "6px 10px", borderRadius: 6 }}>
          {searchError}
        </p>
      )}

      {/* Airbnb-style removable pills for whatever's currently active -
          this is what was missing on mobile: previously the only way to
          see or adjust the search radius was the sidebar, which is
          hidden while viewing the map here. Now it's always visible and
          each part (each category / location+radius) can be dropped on
          its own, right where the search happened. */}
      <ActiveFilters
        categories={activeCategories}
        locationLabel={locationLabel}
        radiusMiles={radiusMiles}
        focusedPlaceName={focusedPlaceName}
        onRemoveCategory={onToggleCategory}
        onClearLocation={onClearLocation}
        onChangeRadius={onChangeRadius}
        onClearFocusedPlace={onClearFocusedPlace}
      />

      {filtersOpen && (
        <div style={{ marginTop: 8, background: "#fff", borderRadius: 10, boxShadow: "0 4px 14px rgba(28,37,48,.3)", maxHeight: "50vh", overflowY: "auto" }}>
          <FilterChips
            categories={categories}
            active={activeCategories}
            onSelect={onToggleCategory}
            defaultOpen
          />
        </div>
      )}
    </div>
  );
}
