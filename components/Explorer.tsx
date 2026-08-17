"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Place } from "@/lib/types";
import type { Bounds } from "@/lib/getPlacesInBounds";
import {
  getPlacesInBounds,
  getPlacesNearby,
  getPlacesByCategories,
  searchPlacesByName,
  findExactPlaceMatch,
  getPlaceByName,
  WORLD_BOUNDS,
} from "@/lib/getPlacesInBounds";
import { parseSearch } from "@/lib/searchParser";
import { geocodeLocation } from "@/lib/geocodeLocation";
import Header from "./Header";
import FilterChips from "./FilterChips";
import SearchBar from "./SearchBar";
import PlaceList from "./PlaceList";
import ActiveFilters from "./ActiveFilters";
import MobileMapControls from "./MobileMapControls";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--moor-light)" }}>
      Loading map…
    </div>
  ),
});

// Matches the categories in your enriched dataset. Always shown in full
// in the picker (not narrowed to "what's currently on screen") so you
// can always add a category that isn't visible in the current view.
// Includes the Brussels-dataset additions (Museum, Monument, Square,
// Palace, Historic Park, Historic Site, Archaeological Site, Historic
// Brewery) - a few close variants (Abbey, Historic Bar, Cathedral,
// Basilica) were merged into existing categories instead of adding
// near-duplicates, see lib/categoryStyle.ts for the full mapping notes.
const ALL_CATEGORIES = [
  "All", "Castle", "Ruin", "Historic Pub", "Stately Home", "Historic Building",
  "Abbey/Priory", "Church", "Fort", "Roman History", "Bridge", "Lighthouse",
  "Windmill", "Stone Circle", "Natural Beauty", "Beach", "Viewpoint",
  "Museum", "Monument", "Square", "Palace", "Historic Park", "Historic Site",
  "Archaeological Site", "Historic Brewery",
];

export default function Explorer({ initialPlaces }: { initialPlaces: Place[] }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const initialQuery = searchParams.get("q") ?? "";
  const initialPlaceParam = searchParams.get("place");
  const initialLocLabel = searchParams.get("loc");
  const paramLat = searchParams.get("lat");
  const paramLng = searchParams.get("lng");
  const paramRadius = searchParams.get("radius");
  const initialUserLoc = paramLat && paramLng ? { lat: parseFloat(paramLat), lng: parseFloat(paramLng) } : null;

  // Multi-select: an empty array means "All" (no category filter).
  // category can arrive as a single value or a comma-joined list (see
  // toCategoryFilterParam in lib/getPlacesInBounds.ts) - either way it's
  // split into the same array the chips/pills work with.
  const [activeCategories, setActiveCategories] = useState<string[]>(
    initialCategory ? initialCategory.split(",").filter((c) => c && c !== "All") : []
  );
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(initialUserLoc);
  const [locationLabel, setLocationLabel] = useState<string | null>(initialUserLoc ? initialLocLabel : null);
  const [radiusMiles, setRadiusMiles] = useState<number | null>(paramRadius ? parseInt(paramRadius, 10) : 20);
  const [focusedPlace, setFocusedPlace] = useState<Place | null>(null);
  // "navigate" = deliberately jump to + zoom in on this place (exact
  // search, "Show on Map", a shared URL). "select" = clicked a marker or
  // list item while already browsing - select it and open its card, but
  // never change the current zoom level.
  const [focusIntent, setFocusIntent] = useState<"navigate" | "select">("select");
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>(initialPlaces);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [mobilePane, setMobilePane] = useState<"map" | "list">("map");
  const lastBounds = useRef<Bounds | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  // true = results follow whatever's currently on screen as you pan the
  // map. false = results are anchored to a location search (radius) or a
  // nationwide category search, regardless of where you've since panned.
  // This is what makes "look at a different area while a search is
  // active" actually show that area - see handleBoundsChange below.
  const [viewportBrowsing, setViewportBrowsing] = useState(!initialUserLoc && activeCategories.length === 0);

  // Category-driven and location-driven results own the result set
  // outright UNTIL the person genuinely pans/zooms the map themselves -
  // at that point browsing should follow wherever they've moved to,
  // same as most map apps, rather than staying stuck on the original
  // search. Programmatic moves (a search resolving, selecting a place,
  // "return to my location") never reach here - see suppressRef in
  // MapView.tsx - so every call here really is the person moving the map.
  const handleBoundsChange = useCallback(
    (bounds: Bounds, wasDrag: boolean) => {
      lastBounds.current = bounds;

      if (!viewportBrowsing) {
        // Anchored to a location/nationwide category search. Zooming
        // (even zooming all the way out) must never clear this - the
        // radius circle should stay put regardless of zoom level, and
        // only an actual drag to a different area, or explicitly
        // tapping the location pill's ✕, should end the search.
        if (!wasDrag) return;
        // A genuine drag - start following the map instead. Any active
        // category filter stays applied, just scoped to the new area
        // rather than nationwide/a fixed radius. The fetch effect below
        // picks this up automatically since viewportBrowsing/userLoc are
        // changing, and it'll read the fresh lastBounds set just above.
        setViewportBrowsing(true);
        setUserLoc(null);
        setLocationLabel(null);
        return;
      }

      // Already following the viewport - lastBounds is a ref, so
      // changing it alone wouldn't retrigger the effect below, hence the
      // direct fetch here. This runs for both drags and zooms, since
      // either genuinely changes what's currently in view.
      (async () => {
        setLoading(true);
        const places = await getPlacesInBounds(bounds, activeCategories.length ? activeCategories : null);
        if (lastBounds.current === bounds) {
          setViewportPlaces(places);
          setLoading(false);
        }
      })();
    },
    [viewportBrowsing, activeCategories]
  );

  const fetchRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++fetchRequestId.current;
    (async () => {
      let places: Place[] | null = null;

      if (!viewportBrowsing && userLoc) {
        // A location is active - radius drives the results (or "Anywhere"
        // if the radius has been cleared to unlimited).
        setLoading(true);
        places = radiusMiles === null
          ? await getPlacesInBounds(WORLD_BOUNDS, activeCategories)
          : await getPlacesNearby(userLoc, radiusMiles, activeCategories);
      } else if (!viewportBrowsing && activeCategories.length > 0) {
        // Category chosen, no location - show it everywhere (UK &
        // Ireland), not just whatever happens to be in view. This is
        // what makes typing/tapping "Castle" show every castle - unless
        // you've since panned the map, in which case viewportBrowsing is
        // already true and this branch is skipped (see below instead).
        setLoading(true);
        places = await getPlacesByCategories(activeCategories);
      } else if (lastBounds.current) {
        // Following the viewport - either no filters at all, or a
        // category filter scoped to whatever's currently in view.
        setLoading(true);
        places = await getPlacesInBounds(lastBounds.current, activeCategories.length ? activeCategories : null);
      }

      // Only the MOST RECENT request is allowed to commit its result -
      // if the radius (or category/location) changed again while this
      // one was in flight, a newer request has already started and this
      // stale one is discarded, however it happens to resolve.
      if (requestId === fetchRequestId.current && places !== null) {
        setViewportPlaces(places);
        setLoading(false);
      }
    })();
  }, [viewportBrowsing, userLoc, radiusMiles, activeCategories]);

  // Live name-search-as-you-type. SearchBar/MobileMapControls already
  // debounce keystrokes locally before calling onChange, so this can run
  // as soon as searchQuery changes rather than debouncing a second time.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    searchPlacesByName(searchQuery).then((results) => {
      if (!cancelled) setSearchResults(results);
    });
    return () => { cancelled = true; };
  }, [searchQuery]);

  function handleLocate() {
    if (!navigator.geolocation) {
      alert("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFocusedPlace(null);
        setLocationLabel("your location");
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setViewportBrowsing(false);
      },
      () => alert("Could not get your location — try browsing the map instead.")
    );
  }

  // A deliberate jump to a specific place - exact search match, "Show on
  // Map" from the homepage/detail page, or a shared/refreshed map URL.
  // This is the only path that's allowed to change the zoom level.
  const navigateToPlace = useCallback((place: Place) => {
    setFocusedPlace(place);
    setFocusIntent("navigate");
    setSearchQuery("");
    setMobilePane("map");
  }, []);

  // Clicking a marker or a list item while already browsing the map -
  // selects the place and opens its card, but must NEVER change the
  // current zoom level (see MapController in MapView.tsx).
  const handleSelectPlace = useCallback((place: Place) => {
    setFocusedPlace(place);
    setFocusIntent("select");
    setSearchQuery("");
    setMobilePane("map");
  }, []);

  const clearFocusedPlace = useCallback(() => {
    setFocusedPlace(null);
  }, []);

  // Picks up a place passed in via the URL (e.g. /map?place=Castle+Howard
  // from "Show on Map" elsewhere in the app, or a refreshed/shared map
  // link) and navigates straight to it, once, on mount.
  const handledInitialPlaceParam = useRef(false);
  useEffect(() => {
    if (handledInitialPlaceParam.current || !initialPlaceParam) return;
    handledInitialPlaceParam.current = true;
    (async () => {
      const match = (await getPlaceByName(initialPlaceParam)) ?? (await findExactPlaceMatch(initialPlaceParam));
      if (match) {
        setViewportBrowsing(false);
        navigateToPlace(match);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the FULL active search reflected in the URL - category(ies),
  // location + its label, radius, and the focused place - using stable
  // identifiers (place name, category name, location label) rather than
  // fragile in-memory state. This is what makes a search survive: a
  // refresh, a shared link, or navigating away and back via the site's
  // global "Map" nav link (which just points at "/map" - without this,
  // that link would always land on a blank map, dropping whatever search
  // was active).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (activeCategories.length) params.set("category", activeCategories.join(","));
    else params.delete("category");

    if (userLoc) {
      params.set("lat", String(userLoc.lat));
      params.set("lng", String(userLoc.lng));
      if (locationLabel) params.set("loc", locationLabel);
      else params.delete("loc");
      if (radiusMiles !== null) params.set("radius", String(radiusMiles));
      else params.delete("radius");
    } else {
      params.delete("lat");
      params.delete("lng");
      params.delete("loc");
      params.delete("radius");
    }

    if (focusedPlace) params.set("place", focusedPlace.name);
    else params.delete("place");

    window.history.replaceState(null, "", url.toString());
  }, [activeCategories, userLoc, locationLabel, radiusMiles, focusedPlace]);

  // Toggling a category never wipes out the others - this is what lets
  // someone search "castles", then tap "Ruin" too, and see both at once.
  // Tapping "All" (or removing the last remaining category) clears back
  // to no filter.
  function toggleCategory(cat: string) {
    if (cat === "All") {
      setActiveCategories([]);
      return;
    }
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function clearLocation() {
    setUserLoc(null);
    setLocationLabel(null);
  }

  // Pressing Enter (or tapping the mobile search button): "castles in
  // York" filters to Castle AND recentres on York, as removable filters -
  // all without leaving the map. Typing an EXACT place name (e.g.
  // "Bamburgh Castle") is checked first and jumps straight to that one
  // place instead. A typed category is ADDED to whatever's already
  // selected (searching "Castles" then "Ruins" shows both) rather than
  // replacing it - use a pill's ✕ or "Clear all" to start over.
  async function handleSearchSubmit(value: string) {
    const query = value.trim();
    if (!query) return;
    setSearchError(null);

    const exact = await findExactPlaceMatch(query);
    if (exact) {
      setViewportBrowsing(false);
      navigateToPlace(exact);
      return;
    }

    const parsed = parseSearch(query);

    if (parsed.category) {
      const cat = parsed.category;
      setActiveCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
    }

    if (parsed.location) {
      const geo = await geocodeLocation(parsed.location);
      if (geo) {
        setFocusedPlace(null);
        setUserLoc({ lat: geo.lat, lng: geo.lng });
        setLocationLabel(parsed.location);
        setRadiusMiles(parsed.radiusMiles ?? radiusMiles ?? 20);
        setViewportBrowsing(false);
        setSearchQuery("");
        return;
      }
      // Couldn't geocode it - make that visible rather than silently
      // leaving whatever was previously on screen, which read as "my
      // search did nothing" or "it's ignoring what I typed".
      setSearchError(`Couldn't find "${parsed.location}" - try a different spelling, or a nearby town.`);
      return;
    }

    if (parsed.category) {
      // Category only, no location - go nationwide and drop any location
      // filter that might have been active from an earlier search.
      clearLocation();
      setViewportBrowsing(false);
      setSearchQuery("");
    }
    // Neither a category nor a location parsed - leave the existing live
    // name-search results as they are, matching by name instead.
  }

  // When an exact place is searched for and focused, it should always
  // show up as a pin and in the list - even if it happens to fall
  // outside the currently active category/location filters, since the
  // person explicitly asked for it by name.
  // The focused place is only force-included when we're anchored to a
  // deliberate search (location/nationwide-category) - it might
  // legitimately fall outside that search's own filters, e.g. an exact
  // place search result that doesn't match the active category. While
  // plainly browsing the viewport (viewportBrowsing=true), forcing it in
  // makes no sense and was the actual bug behind "Brussels list shows a
  // London place" - a previously-focused place from anywhere would keep
  // tagging along into every new area until its card was closed by hand.
  const displayPlaces = useMemo(() => {
    if (!focusedPlace) return viewportPlaces;
    if (viewportPlaces.some((p) => p.name === focusedPlace.name)) return viewportPlaces;
    if (viewportBrowsing) return viewportPlaces;
    return [focusedPlace, ...viewportPlaces];
  }, [viewportPlaces, focusedPlace, viewportBrowsing]);

  const listToShow = searchQuery.trim() ? searchResults : displayPlaces;

  return (
    <div className="vambla-map-page">
      <Header onLocate={handleLocate} />

      <div className="vambla-main">
        <aside className={`vambla-sidebar ${mobilePane === "map" ? "hidden-mobile" : ""}`}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearchSubmit} />
          {searchError && (
            <p style={{ margin: "0 16px 8px", fontSize: 12.5, fontFamily: "'Nunito', sans-serif", color: "var(--brick, #B45309)" }}>
              {searchError}
            </p>
          )}
          <ActiveFilters
            categories={activeCategories}
            locationLabel={locationLabel}
            radiusMiles={radiusMiles}
            focusedPlaceName={focusedPlace?.name ?? null}
            onRemoveCategory={toggleCategory}
            onClearLocation={clearLocation}
            onChangeRadius={setRadiusMiles}
            onClearFocusedPlace={clearFocusedPlace}
          />
          <FilterChips categories={ALL_CATEGORIES} active={activeCategories} onSelect={toggleCategory} />
          <div
            style={{
              padding: "8px 16px",
              fontFamily: "'Nunito', sans-serif",
              fontSize: 11,
              color: "var(--moor-light)",
            }}
          >
            {loading
              ? "Loading…"
              : searchQuery.trim()
              ? `${listToShow.length} result${listToShow.length === 1 ? "" : "s"}`
              : `${listToShow.length} place${listToShow.length === 1 ? "" : "s"} ${userLoc ? "nearby" : activeCategories.length > 0 ? "found" : "in view"}`}
          </div>
          <PlaceList places={listToShow} userLoc={userLoc} onSelect={navigateToPlace} focusedPlaceName={focusedPlace?.name ?? null} />
        </aside>

        <div className={`vambla-map-wrap ${mobilePane === "list" ? "hidden-mobile" : ""}`}>
          <MobileMapControls
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            categories={ALL_CATEGORIES}
            activeCategories={activeCategories}
            onToggleCategory={toggleCategory}
            locationLabel={locationLabel}
            radiusMiles={radiusMiles}
            onChangeRadius={setRadiusMiles}
            onClearLocation={clearLocation}
            focusedPlaceName={focusedPlace?.name ?? null}
            onClearFocusedPlace={clearFocusedPlace}
            searchError={searchError}
          />
          <MapView
            places={displayPlaces}
            userLoc={userLoc}
            locationLabel={locationLabel}
            focusedPlace={focusedPlace}
            focusIntent={focusIntent}
            radiusMiles={userLoc ? radiusMiles : null}
            onBoundsChange={handleBoundsChange}
            onSelectPlace={handleSelectPlace}
            onCloseFocused={clearFocusedPlace}
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
              fontFamily: "'Nunito', sans-serif",
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
