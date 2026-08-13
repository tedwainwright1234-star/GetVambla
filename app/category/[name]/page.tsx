"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Place } from "@/lib/types";
import { getPlacesNearby } from "@/lib/getPlacesInBounds";
import { geocodeLocation } from "@/lib/geocodeLocation";
import { haversineKm, kmToMiles } from "@/lib/distance";
import { TopNav, BottomNav } from "@/components/Nav";
import ResultCard from "@/components/ResultCard";
import RadiusSelector from "@/components/RadiusSelector";
import CategoryIcon from "@/components/CategoryIcon";
import { colorForCategory } from "@/lib/categoryStyle";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div style={{ padding: 30, textAlign: "center", color: "var(--moor-light)" }}>Loading map…</div>,
});

export default function CategoryResultsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const category = decodeURIComponent(name);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchedLoc = searchParams.get("loc");
  const searchedRadius = searchParams.get("radius");

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(searchedRadius ? parseInt(searchedRadius, 10) : 30);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [focusedPlace, setFocusedPlace] = useState<Place | null>(null);

  // If a location was typed in search (e.g. "Castles in North Yorkshire"),
  // use THAT - never fall back to device geolocation in this case, since
  // the user explicitly asked for a specific place, not "near me".
  // Only when no location was searched do we ask for device location.
  useEffect(() => {
    if (searchedLoc) {
      setLoading(true);
      geocodeLocation(searchedLoc).then((geo) => {
        if (geo) {
          setUserLoc({ lat: geo.lat, lng: geo.lng });
          setLocationLabel(searchedLoc);
        } else {
          setGeocodeError(`Couldn't find "${searchedLoc}" - try a different spelling.`);
          setLocationDenied(true);
        }
        setLoading(false);
      });
      return;
    }

    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel("your location");
      },
      () => setLocationDenied(true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchedLoc]);

  useEffect(() => {
    if (!userLoc) return;
    setLoading(true);
    getPlacesNearby(userLoc, radiusMiles, category).then((places) => {
      setResults(places);
      setLoading(false);
    });
  }, [userLoc, radiusMiles, category]);

  async function handleManualLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setGeocodeError(null);
    setLoading(true);
    const geo = await geocodeLocation(manualQuery.trim());
    if (!geo) {
      setGeocodeError(`Couldn't find "${manualQuery}" - try a different spelling or a nearby town.`);
      setLoading(false);
      return;
    }
    setUserLoc({ lat: geo.lat, lng: geo.lng });
    setLocationLabel(manualQuery.trim());
    setLocationDenied(false);
  }

  function handleShowOnMap(place: Place) {
    setFocusedPlace(place);
    setView("map");
  }

  const resultsWithDistance = results
    .map((p) => ({
      ...p,
      dist: userLoc ? kmToMiles(haversineKm(userLoc.lat, userLoc.lng, p.lat, p.lng)) : null,
    }))
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));

  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", paddingBottom: 70, display: "flex", flexDirection: "column" }}>
      <TopNav />

      <div style={{ padding: "22px 20px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: `${colorForCategory(category)}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CategoryIcon category={category} size={24} />
          </span>
          <div>
            <h1 style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", margin: 0 }}>{category}</h1>
            <p style={{ fontSize: 12, color: "var(--moor-light)", margin: 0 }}>
              {locationLabel ? `Near ${locationLabel}` : "Finding places near you…"}
            </p>
          </div>
        </div>

        {/* Map / List toggle */}
        <div role="group" aria-label="View as" style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--moor)", flexShrink: 0 }}>
          {(["list", "map"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              style={{
                padding: "8px 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: view === mode ? "var(--moor)" : "transparent",
                color: view === mode ? "#fff" : "var(--moor)",
              }}
            >
              {mode === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      {userLoc && (
        <div style={{ padding: "10px 20px 0" }}>
          <RadiusSelector value={radiusMiles} onChange={(v) => setRadiusMiles(v ?? 100)} onClear={() => { setUserLoc(null); setLocationLabel(null); }} />
        </div>
      )}

      {locationDenied && !userLoc && (
        <div style={{ margin: "10px 20px", padding: 14, background: "#fff", borderRadius: 10, fontSize: 13 }}>
          <p style={{ margin: "0 0 10px", color: "var(--moor-light)" }}>
            We couldn&apos;t access your location. Search for a town, city, or county instead:
          </p>
          <form onSubmit={handleManualLocation} style={{ display: "flex", gap: 8 }}>
            <input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="e.g. Harrogate, or North Yorkshire"
              aria-label="Search for a location"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--moor)", fontSize: 13 }}
            />
            <button type="submit" style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--ochre)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Search
            </button>
          </form>
          {geocodeError && <p style={{ color: "var(--brick)", fontSize: 12, marginTop: 8 }}>{geocodeError}</p>}
        </div>
      )}

      {loading && <p style={{ color: "var(--moor-light)", fontSize: 13, padding: "14px 20px 0" }}>Loading…</p>}

      {!loading && userLoc && resultsWithDistance.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--moor-light)" }}>
          <p>No {category.toLowerCase()} places found within {radiusMiles} miles.</p>
          <p style={{ fontSize: 12 }}>Try widening your search radius above.</p>
        </div>
      )}

      {view === "list" ? (
        <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {resultsWithDistance.map((p) => (
            <ResultCard key={p.name} place={p} distanceMiles={p.dist} onShowOnMap={handleShowOnMap} />
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 420, margin: "14px 20px", borderRadius: 12, overflow: "hidden" }}>
          <MapView
            places={resultsWithDistance}
            userLoc={userLoc}
            focusedPlace={focusedPlace}
            radiusMiles={userLoc ? radiusMiles : null}
            onBoundsChange={() => {}}
            onSelectPlace={setFocusedPlace}
          />
        </div>
      )}

      <BottomNav />
    </div>
  );
}
