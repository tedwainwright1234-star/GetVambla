"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Place } from "@/lib/types";
import type { Bounds } from "@/lib/getPlacesInBounds";
import { getPlacesInBounds, getPlacesNearby, searchPlacesByName } from "@/lib/getPlacesInBounds";
import { parseSearch } from "@/lib/searchParser";
import { geocodeLocation } from "@/lib/geocodeLocation";
import Header from "./Header";
import FilterChips from "./FilterChips";
import SearchBar from "./SearchBar";
import PlaceList from "./PlaceList";
import RadiusSelector from "./RadiusSelector";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--moor-light)" }}>
      Loading map…
    </div>
  ),
});

// Matches the 16 categories in your enriched dataset.
const ALL_CATEGORIES = [
  "All", "Castle", "Ruin", "Historic Pub", "Stately Home", "Historic Building",
  "Abbey/Priory", "Church", "Fort", "Roman History", "Bridge", "Lighthouse",
  "Windmill", "Stone Circle", "Natural Beauty", "Beach", "Viewpoint",
];

export default function Explorer({ initialPlaces }: { initialPlaces: Place[] }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "All";
  const initialQuery = searchParams.get("q") ?? "";
  const paramLat = searchParams.get("lat");
  const paramLng = searchParams.get("lng");
  const paramRadius = searchParams.get("radius");
  const initialUserLoc = paramLat && paramLng ? { lat: parseFloat(paramLat), lng: parseFloat(paramLng) } : null;

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(initialUserLoc);
  const [radiusMiles, setRadiusMiles] = useState<number | null>(paramRadius ? parseInt(paramRadius, 10) : 20);
  const [focusedPlace, setFocusedPlace] = useState<Place | null>(null);
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>(initialPlaces);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [mobilePane, setMobilePane] = useState<"map" | "list">("map");
  const lastBounds = useRef<Bounds | null>(null);

  const categories = useMemo(() => {
    const found = new Set(viewportPlaces.map((p) => p.category));
    return ["All", ...ALL_CATEGORIES.filter((c) => c !== "All" && found.has(c))];
  }, [viewportPlaces]);

  const handleBoundsChange = useCallback(
    async (bounds: Bounds) => {
      if (userLoc) return; // when "near me" mode is active, radius drives the results instead
      lastBounds.current = bounds;
      setLoading(true);
      const places = await getPlacesInBounds(bounds, activeCategory);
      if (lastBounds.current === bounds) {
        setViewportPlaces(places);
        setLoading(false);
      }
    },
    [activeCategory, userLoc]
  );

  // Radius-based fetch whenever we have a location, and it re-runs if the
  // radius or category changes - this is what powers "Explore Near Me".
  useEffect(() => {
    if (!userLoc) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const places = radiusMiles === null
        ? await getPlacesInBounds({ minLat: -90, minLng: -180, maxLat: 90, maxLng: 180 }, activeCategory)
        : await getPlacesNearby(userLoc, radiusMiles, activeCategory);
      if (!cancelled) {
        setViewportPlaces(places);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userLoc, radiusMiles, activeCategory]);

  useEffect(() => {
    if (!userLoc && lastBounds.current) handleBoundsChange(lastBounds.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchResults(await searchPlacesByName(searchQuery));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function handleLocate() {
    if (!navigator.geolocation) {
      alert("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFocusedPlace(null);
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert("Could not get your location — try browsing the map instead.")
    );
  }

  function handleSelectPlace(place: Place) {
    setFocusedPlace(place);
    setSearchQuery("");
    setMobilePane("map");
  }

  // Pressing Enter in the map search box: "castles in York" filters the
  // map to Castle AND recentres on York - all without leaving the map.
  async function handleSearchSubmit() {
    const value = searchQuery.trim();
    if (!value) return;
    const parsed = parseSearch(value);

    if (parsed.category) {
      setActiveCategory(parsed.category);
    }
    if (parsed.location) {
      const geo = await geocodeLocation(parsed.location);
      if (geo) {
        setFocusedPlace(null);
        setUserLoc({ lat: geo.lat, lng: geo.lng });
        if (parsed.radiusMiles) setRadiusMiles(parsed.radiusMiles);
        setSearchQuery("");
        return;
      }
    }
    // No location resolved (or none given) - leave the existing live
    // name-search results as they are, matching by name instead.
  }

  const listToShow = searchQuery.trim() ? searchResults : viewportPlaces;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Header onLocate={handleLocate} />

      <div className="vambla-main">
        <aside className={`vambla-sidebar ${mobilePane === "map" ? "hidden-mobile" : ""}`}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearchSubmit} />
          {userLoc && (
            <RadiusSelector value={radiusMiles} onChange={setRadiusMiles} onClear={() => setUserLoc(null)} />
          )}
          <FilterChips categories={categories} active={activeCategory} onSelect={setActiveCategory} />
          <div
            style={{
              padding: "8px 16px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "var(--moor-light)",
            }}
          >
            {loading
              ? "Loading…"
              : searchQuery.trim()
              ? `${listToShow.length} result${listToShow.length === 1 ? "" : "s"}`
              : `${listToShow.length} place${listToShow.length === 1 ? "" : "s"} ${userLoc ? "nearby" : "in view"}`}
          </div>
          <PlaceList places={listToShow} userLoc={userLoc} onSelect={handleSelectPlace} />
        </aside>

        <div className={`vambla-map-wrap ${mobilePane === "list" ? "hidden-mobile" : ""}`}>
          <MapView
            places={viewportPlaces}
            userLoc={userLoc}
            focusedPlace={focusedPlace}
            radiusMiles={userLoc ? radiusMiles : null}
            onBoundsChange={handleBoundsChange}
            onSelectPlace={handleSelectPlace}
          />
        </div>
      </div>

      <div className="mobile-toggle">
        {(["map", "list"] as const).map((pane) => (
          <button
            key={pane}
            onClick={() => setMobilePane(pane)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              background: mobilePane === pane ? "var(--moor)" : "var(--parchment)",
              color: mobilePane === pane ? "var(--parchment)" : "var(--moor)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {pane === "map" ? "Map" : "List"}
          </button>
        ))}
      </div>
    </div>
  );
}
