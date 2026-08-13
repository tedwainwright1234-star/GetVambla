"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/lib/types";
import { getRandomPlaces } from "@/lib/discover";
import { getPlacesNearby } from "@/lib/getPlacesInBounds";
import { parseSearch } from "@/lib/searchParser";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { NEARBY_COLLECTIONS } from "@/lib/collections";
import { TopNav, BottomNav } from "./Nav";
import CollectionRow from "./CollectionRow";
import SurpriseMeModal from "./SurpriseMeModal";
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

  async function loadNearby(loc: { lat: number; lng: number }) {
    setUserLoc(loc);
    setNearbyLoading(true);
    const places = await getPlacesNearby(loc, NEARBY_RADIUS_MILES, null);
    setNearbyPool(places.filter((p) => p.imageUrl));
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

    const parsed = parseSearch(value);

    // "Castles in North Yorkshire" -> go straight to that category's
    // results page, with the typed location passed along so it uses
    // THAT place, not your current location.
    if (parsed.category) {
      const url = new URL(`/category/${encodeURIComponent(parsed.category)}`, window.location.origin);
      if (parsed.location) url.searchParams.set("loc", parsed.location);
      if (parsed.radiusMiles) url.searchParams.set("radius", String(parsed.radiusMiles));
      router.push(url.pathname + url.search);
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
        router.push(`/map?lat=${geo.lat}&lng=${geo.lng}&radius=${parsed.radiusMiles ?? NEARBY_RADIUS_MILES}`);
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
          Discover incredible places hidden across Britain and Ireland
        </h1>

        <form onSubmit={handleSearch} style={{ maxWidth: 480, margin: "0 auto 6px" }} role="search">
          <label htmlFor="vambla-search" className="vambla-visually-hidden">
            Search for a category, place, town, or county
          </label>
          <input
            id="vambla-search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Try 'castles in North Yorkshire' or 'Bath'…"
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 30, border: "none",
              fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none",
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
          const matches = nearbyPool.filter(def.matches);
          if (!nearbyLoading && matches.length === 0) return null;
          return (
            <CollectionRow key={def.key} title={def.title} places={matches} loading={nearbyLoading} />
          );
        })}

      <CollectionRow title="Bucket List" places={bucketList} />
      <CollectionRow title="Hidden Gems" places={hiddenGems} />
      <CollectionRow title="Great Views" places={greatViews} />

      {/* Categories now sit at the bottom */}
      <CategoryGrid />

      <BottomNav />

      {surprisePlace && (
        <SurpriseMeModal
          place={surprisePlace}
          userLoc={userLoc}
          onClose={() => setSurprisePlace(null)}
          onAnother={handleSurpriseMe}
        />
      )}
      {surpriseLoading && !surprisePlace && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,37,48,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>
          Finding something amazing…
        </div>
      )}
    </div>
  );
}
