"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { Place } from "@/lib/types";
import type { Bounds } from "@/lib/getPlacesInBounds";
import { colorForCategory } from "@/lib/categoryStyle";
import { iconDefForCategory } from "./CategoryIcon";
import MapLegend from "./MapLegend";
import DirectionsButton from "./DirectionsButton";
import { haversineKm, kmToMiles } from "@/lib/distance";

const iconCache: Record<string, L.DivIcon> = {};

function svgMarkup(category: string): string {
  const def = iconDefForCategory(category);
  const paths = def.paths.map((d) => `<path d="${d}" fill-rule="evenodd"/>`).join("");
  return `<svg viewBox="${def.viewBox}" width="18" height="18" fill="#fff" stroke="none">${paths}</svg>`;
}

function iconForCategory(category: string, selected = false): L.DivIcon {
  const cacheKey = selected ? `${category}__selected` : category;
  if (!iconCache[cacheKey]) {
    const color = colorForCategory(category);
    const size = selected ? 44 : 32;
    const ring = selected ? `box-shadow: 0 0 0 4px ${color}55, 0 4px 12px rgba(0,0,0,.45);` : `box-shadow: 0 2px 6px rgba(0,0,0,.4);`;
    iconCache[cacheKey] = L.divIcon({
      className: "",
      html: `
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};border:2.5px solid #fff;
          display:flex;align-items:center;justify-content:center;
          ${ring}
          transition: transform .15s ease;
          transform: ${selected ? "scale(1.08)" : "scale(1)"};
        ">
          ${svgMarkup(category)}
        </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }
  return iconCache[cacheKey];
}

const userIcon = L.divIcon({
  className: "",
  html: '<div class="user-marker"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Map style options. OSM is the default and always available (no key).
// Satellite and Hybrid both use Esri's public tile services, which are
// free and keyless for light/moderate use - no signup needed. Hybrid
// stacks a roads/labels reference layer on top of the satellite imagery.
type MapStyle = "standard" | "satellite" | "hybrid";

type TileConfig = {
  base: { url: string; attribution: string; maxZoom: number };
  overlay?: { url: string; attribution: string; maxZoom: number };
};

const TILE_LAYERS: Record<MapStyle, TileConfig> = {
  standard: {
    base: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    },
  },
  satellite: {
    base: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      maxZoom: 18,
    },
  },
  hybrid: {
    base: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      maxZoom: 18,
    },
    // Roads, place names and boundaries, drawn transparently on top of
    // the satellite imagery above - this is what makes it "hybrid".
    overlay: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      attribution: "Labels &copy; Esri",
      maxZoom: 18,
    },
  },
};

type Props = {
  places: Place[];
  userLoc: { lat: number; lng: number } | null;
  focusedPlace: Place | null;
  radiusMiles: number | null; // null = "Anywhere", no circle drawn
  onBoundsChange: (bounds: Bounds) => void;
  onSelectPlace?: (place: Place) => void;
};

function MapController({ userLoc, focusedPlace }: Pick<Props, "userLoc" | "focusedPlace">) {
  const map = useMap();
  useEffect(() => {
    if (focusedPlace) {
      map.setView([focusedPlace.lat, focusedPlace.lng], 13, { animate: true });
    } else if (userLoc) {
      map.setView([userLoc.lat, userLoc.lng], 10, { animate: true });
    }
  }, [userLoc, focusedPlace, map]);
  return null;
}

// Reports the map's bounds ONLY on initial load - panning/zooming no
// longer auto-fetches. This used to re-fetch and re-cluster up to 500
// markers on every single pan/zoom (debounced only 250ms), which was
// causing rapid memory growth during active map exploration. Now,
// "Search this area" (below) is the only way to fetch a new viewport
// after the first load - a deliberate, infrequent action instead of a
// continuous one.
function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (b: Bounds) => void }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const report = (map: L.Map) => {
    const b = map.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
  };

  const map = useMapEvents({
    load: () => report(map),
    moveend: () => {
      // A much longer debounce (900ms) than before - this only fires once
      // the map has genuinely settled after you stop panning/zooming, not
      // on every incremental step of an active drag. That's what keeps
      // this lightweight enough not to repeat the earlier memory issue,
      // while still updating automatically without needing a button.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => report(map), 900);
    },
  });

  useEffect(() => {
    report(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// "Return to my location" button - only rendered when we actually have a
// location to return to.
function ReturnToLocationControl({ userLoc }: { userLoc: { lat: number; lng: number } | null }) {
  const map = useMap();
  if (!userLoc) return null;
  return (
    <button
      onClick={() => map.setView([userLoc.lat, userLoc.lng], 11, { animate: true })}
      aria-label="Return to my location"
      title="Return to my location"
      style={{
        position: "absolute", top: 14, right: 14, zIndex: 900,
        width: 40, height: 40, borderRadius: "50%", background: "#fff",
        border: "1.5px solid var(--ink)", boxShadow: "0 2px 8px rgba(28,37,48,.25)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}
    >
      <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
}

// Map style switcher - Standard always available; Satellite is free/
// keyless; Hybrid only appears if a MapTiler key is configured.
function StyleSwitcher({ style, onChange }: { style: MapStyle; onChange: (s: MapStyle) => void }) {
  const [open, setOpen] = useState(false);
  const options: { value: MapStyle; label: string }[] = [
    { value: "standard", label: "Street" },
    { value: "satellite", label: "Satellite" },
    { value: "hybrid" as MapStyle, label: "Hybrid" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 92, right: 14, zIndex: 900 }}>
      {open && (
        <div
          role="group"
          aria-label="Map style"
          style={{
            background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(28,37,48,.3)",
            overflow: "hidden", marginBottom: 8, minWidth: 130,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              aria-pressed={style === opt.value}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 14px", fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 600,
                border: "none", cursor: "pointer",
                background: style === opt.value ? "var(--moor)" : "transparent",
                color: style === opt.value ? "#fff" : "var(--ink)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change map layers"
        aria-expanded={open}
        title="Map layers"
        style={{
          width: 42, height: 42, borderRadius: 8, background: "#fff",
          border: "1.5px solid var(--ink)", boxShadow: "0 2px 8px rgba(28,37,48,.25)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2L2 8l10 6 10-6-10-6z" />
          <path d="M2 14l10 6 10-6" />
        </svg>
      </button>
    </div>
  );
}

export default function MapView({ places, userLoc, focusedPlace, radiusMiles, onBoundsChange, onSelectPlace }: Props) {
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard");

  // Data-safety guard: never attempt to render a marker for a place with
  // missing/invalid coordinates - it's silently excluded rather than
  // crashing the map or showing a marker at (0,0).
  const validPlaces = places.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
  );
  const visibleCategories = Array.from(new Set(validPlaces.map((p) => p.category))).sort();
  const tile = TILE_LAYERS[mapStyle];

  function handleBoundsChangeWrapped(b: Bounds) {
    onBoundsChange(b);
  }

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
    <MapContainer
      center={[54.5, -3.5]}
      zoom={6}
      scrollWheelZoom={true}
      wheelPxPerZoomLevel={180}
      zoomControl={false}
      style={{ height: "100%", width: "100%", background: "#dfe6da" }}
    >
      <ZoomControl position="bottomright" />
      <TileLayer key={`${mapStyle}-base`} url={tile.base.url} attribution={tile.base.attribution} maxZoom={tile.base.maxZoom} />
      {tile.overlay && (
        <TileLayer key={`${mapStyle}-overlay`} url={tile.overlay.url} attribution={tile.overlay.attribution} maxZoom={tile.overlay.maxZoom} />
      )}

      <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
        {validPlaces.map((p) => {
          const distanceMiles = userLoc ? kmToMiles(haversineKm(userLoc.lat, userLoc.lng, p.lat, p.lng)) : null;
          return (
          <Marker
            key={`${p.name}-${p.lat}-${p.lng}`}
            position={[p.lat, p.lng]}
            icon={iconForCategory(p.category, focusedPlace?.name === p.name)}
            eventHandlers={{ click: () => onSelectPlace?.(p) }}
            zIndexOffset={focusedPlace?.name === p.name ? 500 : 0}
          >
            <Tooltip direction="auto" offset={[10, 0]} opacity={1} className="vambla-hover-tooltip">
              <div style={{ width: 180 }}>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt=""
                    style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4, marginBottom: 6, display: "block" }}
                    loading="lazy"
                  />
                )}
                <div style={{ fontFamily: "'Bitter', serif", fontWeight: 700, fontSize: 13, whiteSpace: "normal" }}>{p.name}</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--moor-light)", margin: "2px 0 4px", whiteSpace: "normal" }}>
                  {p.category} · {p.county}{p.cost ? ` · ${p.cost}` : ""}
                </div>
                {p.whyInteresting && (
                  <div style={{ fontSize: 11.5, lineHeight: 1.35, color: "#3c4a3a", whiteSpace: "normal", wordWrap: "break-word" }}>{p.whyInteresting}</div>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ width: 200 }}>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 4, marginBottom: 6 }}
                    loading="lazy"
                  />
                )}
                <p className="popup-name">{p.name}</p>
                <p className="popup-meta">
                  {p.category} · {p.county}
                  {p.cost ? ` · ${p.cost}` : ""}
                  {distanceMiles !== null ? ` · ${distanceMiles.toFixed(1)} mi` : ""}
                </p>
                {p.whyInteresting && <p className="popup-why">{p.whyInteresting}</p>}
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <DirectionsButton lat={p.lat} lng={p.lng} compact />
                  <a
                    href={`/place/${encodeURIComponent(p.name)}`}
                    style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, border: "1.5px solid var(--ochre-dark)", color: "var(--ochre-dark)", textDecoration: "none" }}
                  >
                    View details
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );})}
      </MarkerClusterGroup>

      {userLoc && (
        <>
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon} zIndexOffset={1000} />
          {radiusMiles !== null && (
            <Circle
              center={[userLoc.lat, userLoc.lng]}
              radius={radiusMiles * 1609.34}
              pathOptions={{ color: "#B8842A", weight: 1.5, opacity: 0.6, fill: true, fillOpacity: 0.04, dashArray: "4 6" }}
            />
          )}
        </>
      )}

      <MapController userLoc={userLoc} focusedPlace={focusedPlace} />
      <BoundsWatcher onBoundsChange={handleBoundsChangeWrapped} />
      <ReturnToLocationControl userLoc={userLoc} />
    </MapContainer>
    <StyleSwitcher style={mapStyle} onChange={setMapStyle} />
    <MapLegend categories={visibleCategories} />
    </div>
  );
}
