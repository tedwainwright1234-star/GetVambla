"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/lib/types";
import { getRandomPlaces } from "@/lib/discover";
import { getPlacesNearby, findExactPlaceMatch } from "@/lib/getPlacesInBounds";
import { parseSearch } from "@/lib/searchParser";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { NEARBY_COLLECTIONS } from "@/lib/collections";
import { shuffle } from "@/lib/shuffle";
import { TopNav, BottomNav } from "./Nav";
import CollectionRow from "./CollectionRow";
import SurpriseMeModal from "./SurpriseMeModal";
import PlaceQuickViewModal from "./PlaceQuickViewModal";
import CategoryGrid from "./CategoryGrid";

type Props = {
  bucketList: Place[];
  hiddenGems: Place[];
  greatViews: Place[];
};

const NEARBY_RADIUS_MILES = 30;

export default function DiscoverHome({ bucketList, hiddenGems, greatViews }: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPool, setNearbyPool] = useState<Place[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [surprisePlace, setSurprisePlace] = useState<Place | null>(null);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [quickViewPlace, setQuickViewPlace] = useState<Place | null>(null);

  async function loadNearby(loc: { lat: number; lng: number }) {
    setUserLoc(loc);
    setNearbyLoading(true);
    const places = await getPlacesNearby(loc, NEARBY_RADIUS_MILES, null);
    // nearby_places() orders nearest-first, which is right for a single
    // "how far away" answer but wrong for these rotating collection rows
    // - without shuffling, the same nearest 30 pubs/castles/etc would show
    // up every single time. Shuffle once here so each visit mixes it up.
    setNearbyPool(shuffle(places.filter((p) => p.imageUrl)));
    setNearbyLoading(false);
  }

  // Automatically try to show "near me" collections on load - the whole
  // point of them is to be there when you land on the homepage, not
  // hidden behind an extra click. If permission is denied, we just fall
  // back quietly (see locationDenied) rather than repeatedly asking.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => loadNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationDenied(true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFindNearby() {
    if (!navigator.geolocation) return;
    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationDenied(false);
        loadNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setNearbyLoading(false)
    );
  }

  async function handleSurpriseMe() {
    setSurpriseLoading(true);
    const [place] = await getRandomPlaces({ count: 1, requireImage: true });
    setSurprisePlace(place ?? null);
    setSurpriseLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = searchValue.trim();
    if (!value) return;
    setSearchError(null);

    setSearchBusy(true);
    const exact = await findExactPlaceMatch(value);
    setSearchBusy(false);
    if (exact) {
      router.push(`/place/${encodeURIComponent(exact.name)}`);
      return;
    }

    const parsed = parseSearch(value);

    // "Castles in North Yorkshire" - resolve the location once here and
    // send BOTH the category and the resolved coordinates into /map, so
    // Map View opens already showing exactly this search (not a
    // nationwide category search, not a re-prompt for location).
    if (parsed.category && parsed.location) {
      setSearchBusy(true);
      const geo = await geocodeLocation(parsed.location);
      setSearchBusy(false);
      if (geo) {
        const url = new URL("/map", window.location.origin);
        url.searchParams.set("category", parsed.category);
        url.searchParams.set("lat", String(geo.lat));
        url.searchParams.set("lng", String(geo.lng));
        url.searchParams.set("loc", parsed.location);
        url.searchParams.set("radius", String(parsed.radiusMiles ?? NEARBY_RADIUS_MILES));
        router.push(url.pathname + url.search);
        return;
      }
      // Couldn't geocode the location - fall through to a plain,
      // nationwide category search rather than losing the category too.
    }

    // "Castles" on its own - every castle in the UK & Ireland.
    if (parsed.category) {
      router.push(`/map?category=${encodeURIComponent(parsed.category)}`);
      return;
    }

    // A location on its own (e.g. just "Bath") - geocode it and open the
    // map centred there. Falls back to a name search if it doesn't
    // resolve as a place (it might be a specific attraction's name).
    if (parsed.location) {
      setSearchBusy(true);
      const geo = await geocodeLocation(parsed.location);
      setSearchBusy(false);
      if (geo) {
        const url = new URL("/map", window.location.origin);
        url.searchParams.set("lat", String(geo.lat));
        url.searchParams.set("lng", String(geo.lng));
        url.searchParams.set("loc", parsed.location);
        url.searchParams.set("radius", String(parsed.radiusMiles ?? NEARBY_RADIUS_MILES));
        router.push(url.pathname + url.search);
        return;
      }
      router.push(`/map?q=${encodeURIComponent(value)}`);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", paddingBottom: 70 }}>
      <TopNav />

      {/* Hero */}
      <div style={{ padding: "44px 20px 30px", textAlign: "center", background: "var(--ink)" }}>
        <h1 style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: "clamp(24px, 5vw, 38px)", color: "var(--parchment)", maxWidth: 620, margin: "0 auto 18px", lineHeight: 1.25 }}>
          Discover remarkable places hiding in plain sight
        </h1>

        <form onSubmit={handleSearch} style={{ maxWidth: 480, margin: "0 auto 6px" }} role="search">
          <label htmlFor="vambla-search" className="vambla-visually-hidden">
            Search for a category, place, town, or county
          </label>
          <input
            id="vambla-search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search for your next adventure…"
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 30, border: "none",
              fontSize: 16, fontFamily: "'Inter', sans-serif", outline: "none",
            }}
          />
        </form>
        {searchBusy && <p style={{ color: "var(--ochre)", fontSize: 12, margin: "0 0 10px" }}>Searching…</p>}
        {searchError && <p style={{ color: "#f3a5a5", fontSize: 12, margin: "0 0 10px" }}>{searchError}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={handleFindNearby}
            aria-label="Find places near your current location"
            style={{
              background: "transparent", border: "1.5px solid var(--parchment)", color: "var(--parchment)",
              padding: "11px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            📍 Explore Near Me
          </button>
          <button
            onClick={handleSurpriseMe}
            aria-label="Show me a random remarkable place"
            style={{
              background: "var(--ochre)", border: "none", color: "var(--ink)",
              padding: "11px 20px", borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            🎲 Surprise Me
          </button>
        </div>
        {locationDenied && (
          <p style={{ color: "var(--ochre)", fontSize: 11.5, marginTop: 10, opacity: 0.85 }}>
            Turn on location access to see collections near you, or search a town/county above.
          </p>
        )}
      </div>

      {/* Collections come first - this is the main content of the homepage */}
      {(nearbyLoading || nearbyPool.length > 0) &&
        NEARBY_COLLECTIONS.map((def) => {
          const matches = nearbyPool.filter(def.matches).slice(0, 30);
          if (!nearbyLoading && matches.length === 0) return null;
          return (
            <CollectionRow key={def.key} title={def.title} places={matches} loading={nearbyLoading} onSelectPlace={setQuickViewPlace} />
          );
        })}

      <CollectionRow title="Bucket List" places={bucketList} onSelectPlace={setQuickViewPlace} />
      <CollectionRow title="Hidden Gems" places={hiddenGems} onSelectPlace={setQuickViewPlace} />
      <CollectionRow title="Great Views" places={greatViews} onSelectPlace={setQuickViewPlace} />

      {/* Categories now sit at the bottom */}
      <CategoryGrid />

      <BottomNav />

      {surprisePlace && (
        <SurpriseMeModal
          place={surprisePlace}
          userLoc={userLoc}
          onClose={() => setSurprisePlace(null)}
          onAnother={handleSurpriseMe}
          onShowOnMap={() => router.push(`/map?place=${encodeURIComponent(surprisePlace.name)}`)}
        />
      )}
      {surpriseLoading && !surprisePlace && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(28,37,48,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, color: "#fff", fontFamily: "'Nunito', sans-serif" }}>
          Finding something amazing…
        </div>
      )}
      {quickViewPlace && (
        <PlaceQuickViewModal place={quickViewPlace} onClose={() => setQuickViewPlace(null)} />
      )}
    </div>
  );
}
