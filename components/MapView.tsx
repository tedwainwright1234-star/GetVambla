"use client";

import { memo, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Circle, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { Place } from "@/lib/types";
import type { Bounds } from "@/lib/getPlacesInBounds";
import { colorForCategory } from "@/lib/categoryStyle";
import { iconDefForCategory } from "./CategoryIcon";
import MapLegend from "./MapLegend";
import PlaceDetailCard from "./PlaceDetailCard";

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

// Shared between the clustered markers and the separately-rendered
// focused marker (see the comment near MarkerClusterGroup below for why
// the focused one lives outside the cluster group entirely).
function renderPlaceMarker(
  p: Place,
  { onSelectPlace, selected = false, dimmed = false }: { onSelectPlace?: (place: Place) => void; selected?: boolean; dimmed?: boolean }
) {
  return (
    <Marker
      key={`${p.name}-${p.lat}-${p.lng}`}
      position={[p.lat, p.lng]}
      icon={iconForCategory(p.category, selected)}
      opacity={dimmed && !selected ? 0.4 : 1}
      eventHandlers={{ click: () => onSelectPlace?.(p) }}
      zIndexOffset={selected ? 500 : 0}
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
    </Marker>
  );
}

// Map style options. "Standard" is the default - see its comment below
// for why it's CARTO rather than raw OSM tiles. Satellite and Hybrid both
// use Esri's public tile services, which are free and keyless for light/
// moderate use - no signup needed. Hybrid stacks a roads/labels reference
// layer on top of the satellite imagery.
type MapStyle = "standard" | "osm" | "satellite" | "hybrid";

type TileConfig = {
  base: { url: string; attribution: string; maxZoom: number; detectRetina?: boolean };
  overlay?: { url: string; attribution: string; maxZoom: number; detectRetina?: boolean };
};

const TILE_LAYERS: Record<MapStyle, TileConfig> = {
  // Default style. Same OpenStreetMap data underneath, served through
  // CARTO's free Voyager basemap - which genuinely supports retina/
  // high-DPI tiles (the {r} placeholder below becomes "@2x" on
  // high-density screens via detectRetina). This is the actual fix for
  // the blurry-labels issue: OSM's own tile servers only ever serve flat
  // 256px tiles with no retina variant at all, so on any Retina/high-DPI
  // display the browser has no choice but to upscale a lower-resolution
  // image - exactly the softness that made labels like "London" look
  // pixelated. No API key, no cost, no new dependency - just a different
  // free tile source for the same underlying map data.
  standard: {
    base: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 20,
      detectRetina: true,
    },
  },
  // Classic OpenStreetMap tiles, kept available as an explicit choice -
  // flat 256px with no retina variant (this is the style that looked
  // soft on high-DPI screens; "Standard" above is the crisper default).
  osm: {
    base: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
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
  locationLabel?: string | null;
  focusedPlace: Place | null;
  // "navigate" = a deliberate jump to this place (exact search, "Show on
  // Map", a shared/refreshed URL) - the map centres and zooms in.
  // "select" = the person clicked a marker or list item while already
  // browsing the map - the place is selected and its card opens, but the
  // current zoom level is left exactly as it was (see requirement: marker
  // clicks must never change zoom).
  focusIntent: "navigate" | "select";
  radiusMiles: number | null; // null = "Anywhere", no circle drawn
  onBoundsChange: (bounds: Bounds) => void;
  onSelectPlace?: (place: Place) => void;
  onCloseFocused?: () => void;
};

// The place detail card covers the bottom ~60% of the screen on mobile
// (a bottom sheet) or the right ~380px on desktop (a side panel) - see
// .vambla-place-card in globals.css. Centering the map normally on a
// "navigate" target would put it right behind that card. This computes
// a shifted map centre so the target instead lands in the middle of
// whatever's actually still visible, above/beside the card.
function computeOffsetCenter(map: L.Map, lat: number, lng: number, zoom: number): L.LatLng {
  if (typeof window === "undefined") return L.latLng(lat, lng);
  const isMobile = window.innerWidth <= 768;
  const targetPoint = map.project([lat, lng], zoom);
  // Shifting the "fake" centre further into the card's own footprint
  // (south for a bottom sheet, east for a right panel) makes the real
  // target render on the opposite side - i.e. in the visible area.
  const shift = isMobile
    ? L.point(0, Math.min(window.innerHeight * 0.6, window.innerHeight - 120) / 2 + 24)
    : L.point(Math.min(380, window.innerWidth * 0.92) / 2, 0);
  return map.unproject(targetPoint.add(shift), zoom);
}

function MapController({ userLoc, focusedPlace, focusIntent, suppressRef }: Pick<Props, "userLoc" | "focusedPlace" | "focusIntent"> & { suppressRef: React.MutableRefObject<boolean> }) {
  const map = useMap();

  // Only a genuine "navigate" (not a marker/list "select") ever changes
  // the zoom level - this is what keeps clicking a marker from zooming
  // the map out to fit a fixed level. "navigate" is also always followed
  // by the place card opening, so the target is offset to stay clear of
  // it rather than landing dead-centre underneath.
  useEffect(() => {
    if (focusedPlace && focusIntent === "navigate") {
      suppressRef.current = true;
      const zoom = 15;
      const center = computeOffsetCenter(map, focusedPlace.lat, focusedPlace.lng, zoom);
      map.setView(center, zoom, { animate: true });
    }
  }, [focusedPlace, focusIntent, map, suppressRef]);

  // A brand new location search (not a place selection, not closing a
  // card) recentres the map - this is the "Explore Near Me" / typed
  // location behaviour, unrelated to marker selection.
  useEffect(() => {
    if (userLoc) {
      suppressRef.current = true;
      map.setView([userLoc.lat, userLoc.lng], 10, { animate: true });
    }
  }, [userLoc, map, suppressRef]);

  return null;
}

// Reports the map's bounds on load, and again whenever the map settles
// after a genuine pan/zoom (debounced 900ms so it only fires once
// you've actually stopped moving, not on every incremental step of an
// active drag - re-fetching on every step was what caused rapid memory
// growth in an earlier version). Programmatic moves (a search resolving,
// selecting a place, "return to my location") are deliberately excluded
// via suppressRef - only moves the user actually initiated by dragging/
// scrolling/pinching the map count as "browse this new area".
function BoundsWatcher({ onBoundsChange, suppressRef }: { onBoundsChange: (b: Bounds) => void; suppressRef: React.MutableRefObject<boolean> }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const report = (map: L.Map) => {
    if (suppressRef.current) {
      // This settling was from our own programmatic move (a search
      // resolving, a place selection, "return to my location") - not a
      // genuine user pan/zoom, so it must not be treated as "the user
      // wants to browse this new area" (see Explorer.tsx's
      // handleBoundsChange, which uses exactly that distinction).
      suppressRef.current = false;
      return;
    }
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
function ReturnToLocationControl({ userLoc, suppressRef }: { userLoc: { lat: number; lng: number } | null; suppressRef: React.MutableRefObject<boolean> }) {
  const map = useMap();
  if (!userLoc) return null;
  return (
    <button
      onClick={() => {
        suppressRef.current = true;
        map.setView([userLoc.lat, userLoc.lng], 11, { animate: true });
      }}
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

// Map style switcher - all four options are free/keyless (CARTO Voyager,
// classic OSM, and Esri satellite/hybrid all need no API key or signup).
function StyleSwitcher({ style, onChange }: { style: MapStyle; onChange: (s: MapStyle) => void }) {
  const [open, setOpen] = useState(false);
  const options: { value: MapStyle; label: string }[] = [
    { value: "standard", label: "Standard" },
    { value: "osm", label: "OpenStreetMap" },
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

function MapView({ places, userLoc, locationLabel, focusedPlace, focusIntent, radiusMiles, onBoundsChange, onSelectPlace, onCloseFocused }: Props) {
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard");
  // Shared between MapController/BoundsWatcher/ReturnToLocationControl -
  // true for the brief window after WE move the map ourselves, so the
  // resulting "moveend" isn't mistaken for the user browsing to a new
  // area. See BoundsWatcher's report() for where this is consumed.
  const suppressNextBounds = useRef(false);

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
      <TileLayer key={`${mapStyle}-base`} url={tile.base.url} attribution={tile.base.attribution} maxZoom={tile.base.maxZoom} detectRetina={tile.base.detectRetina} />
      {tile.overlay && (
        <TileLayer key={`${mapStyle}-overlay`} url={tile.overlay.url} attribution={tile.overlay.attribution} maxZoom={tile.overlay.maxZoom} detectRetina={tile.overlay.detectRetina} />
      )}

      <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
        {validPlaces
          .filter((p) => focusedPlace?.name !== p.name)
          .map((p) => renderPlaceMarker(p, { onSelectPlace, dimmed: !!focusedPlace }))}
      </MarkerClusterGroup>

      {/* The focused place is deliberately rendered OUTSIDE the cluster
          group, as its own always-visible layer. Markers inside a
          MarkerClusterGroup get absorbed into a cluster bubble once
          zoomed out far enough, regardless of any "selected" styling -
          rendering it separately guarantees it stays visible and
          distinct as its own pin at any zoom level, exactly what makes
          it possible to spot even after zooming out. */}
      {focusedPlace && Number.isFinite(focusedPlace.lat) && Number.isFinite(focusedPlace.lng) && (
        renderPlaceMarker(focusedPlace, { onSelectPlace, selected: true })
      )}

      {userLoc && (
        <>
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon} zIndexOffset={1000}>
            {locationLabel && (
              <Tooltip permanent direction="top" offset={[0, -8]} opacity={1} className="vambla-centre-label">
                {locationLabel === "your location" ? "Your location" : locationLabel}
              </Tooltip>
            )}
          </Marker>
          {radiusMiles !== null && (
            <>
              {/* Dark contrast halo underneath - keeps the boundary
                  readable against bright basemaps (satellite imagery
                  especially), where a thin ochre line alone tends to
                  disappear. */}
              <Circle
                center={[userLoc.lat, userLoc.lng]}
                radius={radiusMiles * 1609.34}
                pathOptions={{ color: "#1C2530", weight: 5, opacity: 0.35, fill: false }}
              />
              {/* The actual boundary - thicker and much more opaque than
                  before, with a light fill so the search area reads
                  clearly at a glance without hiding roads/markers under
                  it. */}
              <Circle
                center={[userLoc.lat, userLoc.lng]}
                radius={radiusMiles * 1609.34}
                pathOptions={{ color: "#B8842A", weight: 3, opacity: 0.95, fill: true, fillColor: "#B8842A", fillOpacity: 0.07, dashArray: "8 6" }}
              />
            </>
          )}
        </>
      )}

      <MapController userLoc={userLoc} focusedPlace={focusedPlace} focusIntent={focusIntent} suppressRef={suppressNextBounds} />
      <BoundsWatcher onBoundsChange={handleBoundsChangeWrapped} suppressRef={suppressNextBounds} />
      <ReturnToLocationControl userLoc={userLoc} suppressRef={suppressNextBounds} />
    </MapContainer>
    <StyleSwitcher style={mapStyle} onChange={setMapStyle} />
    <MapLegend categories={visibleCategories} />
    {focusedPlace && (
      <PlaceDetailCard place={focusedPlace} userLoc={userLoc} onClose={() => onCloseFocused?.()} />
    )}
    </div>
  );
}

export default memo(MapView);
