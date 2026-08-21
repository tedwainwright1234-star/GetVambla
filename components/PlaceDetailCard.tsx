"use client";

import { useRef, useState } from "react";
import type { Place } from "@/lib/types";
import { colorForCategory } from "@/lib/categoryStyle";
import { haversineKm, kmToMiles } from "@/lib/distance";
import CategoryIcon from "./CategoryIcon";
import SaveButton from "./SaveButton";
import DirectionsButton from "./DirectionsButton";

type Props = {
  place: Place;
  userLoc: { lat: number; lng: number } | null;
  onClose: () => void;
};

// How far down (in px) the card needs to be dragged before letting go
// counts as "dismiss" rather than snapping back into place.
const SWIPE_DISMISS_THRESHOLD = 100;

// Shown over the map (see .vambla-place-card in globals.css: a right-hand
// panel on desktop, a bottom sheet on mobile) whenever a place is
// focused - via exact search, "Show on Map", or clicking a marker/list
// item. It's a plain overlay with its own scroll, so opening it never
// touches the map's zoom or pan - the map stays exactly where it was.
export default function PlaceDetailCard({ place, userLoc, onClose }: Props) {
  const color = colorForCategory(place.category);
  const hasValidCoords = Number.isFinite(place.lat) && Number.isFinite(place.lng);
  const distanceMiles = userLoc ? kmToMiles(haversineKm(userLoc.lat, userLoc.lng, place.lat, place.lng)) : null;

  // Swipe-down-to-dismiss (mobile bottom sheet). Dragging is only
  // tracked from the image/handle area at the top of the card, not the
  // scrollable body below - otherwise scrolling the description text
  // would fight with the dismiss gesture.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta); // only follow downward drags
  }
  function handleTouchEnd() {
    setDragging(false);
    if (dragY > SWIPE_DISMISS_THRESHOLD) {
      onClose();
    }
    setDragY(0);
    touchStartY.current = null;
  }

  return (
    <div
      className="vambla-place-card"
      role="dialog"
      aria-label={place.name}
      style={{
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragging ? "none" : "transform 0.25s ease",
      }}
    >
      {/* Small grab handle, mobile only (see .vambla-place-card-handle in
          globals.css) - signals the card can be dragged, same visual
          convention as most mobile bottom sheets. */}
      <div
        className="vambla-place-card-handle"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div
        className="vambla-place-card-image"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flexShrink: 0, position: "relative", overflow: "hidden",
          background: place.imageUrl ? "#000" : `linear-gradient(135deg, ${color}dd, ${color}99)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          touchAction: "none",
        }}
      >
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ transform: "scale(3)" }}>
            <CategoryIcon category={place.category} size={24} />
          </div>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)",
            border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      <div className="vambla-place-card-body" style={{ padding: 18, overflowY: "auto", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 20, color: "var(--ink)" }}>{place.name}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--moor-light)", marginTop: 3 }}>
              {place.category} · {place.county}
              {place.cost ? ` · ${place.cost}` : ""}
              {distanceMiles !== null ? ` · ${distanceMiles.toFixed(1)} mi away` : ""}
            </div>
          </div>
          <SaveButton placeName={place.name} size={22} />
        </div>

        {place.whyInteresting && (
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3c4a3a", margin: "14px 0" }}>{place.whyInteresting}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {hasValidCoords && <DirectionsButton lat={place.lat} lng={place.lng} label="Get Directions" />}
          <a
            href={`/place/${encodeURIComponent(place.name)}`}
            style={{
              display: "inline-flex", alignItems: "center", padding: "9px 14px", borderRadius: 7,
              border: "1.5px solid var(--ochre-dark)", color: "var(--ochre-dark)", textDecoration: "none",
              fontSize: 13, fontWeight: 600,
            }}
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  );
}
