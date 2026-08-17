"use client";

import type { Place } from "@/lib/types";
import { colorForCategory } from "@/lib/categoryStyle";
import CategoryIcon from "./CategoryIcon";
import SaveButton from "./SaveButton";
import { haversineKm, kmToMiles } from "@/lib/distance";

type Props = {
  place: Place;
  userLoc: { lat: number; lng: number } | null;
  onClose: () => void;
  onAnother: () => void;
  onShowOnMap: () => void;
};

export default function SurpriseMeModal({ place, userLoc, onClose, onAnother, onShowOnMap }: Props) {
  const color = colorForCategory(place.category);
  const distanceMiles = userLoc ? kmToMiles(haversineKm(userLoc.lat, userLoc.lng, place.lat, place.lng)) : null;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(28,37,48,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 3000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 18, maxWidth: 420, width: "100%",
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ height: 160, background: place.imageUrl ? "#000" : `linear-gradient(135deg, ${color}dd, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          {place.imageUrl ? (
            <img src={place.imageUrl} alt={place.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ transform: "scale(3)" }}>
              <CategoryIcon category={place.category} size={24} />
            </div>
          )}
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 21, color: "var(--ink)" }}>{place.name}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--moor-light)", marginTop: 3 }}>
                {place.category} · {place.county}
                {distanceMiles !== null ? ` · ${distanceMiles.toFixed(0)} mi away` : ""}
              </div>
            </div>
            <SaveButton placeName={place.name} size={24} />
          </div>

          {place.whyInteresting && (
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3c4a3a", margin: "14px 0" }}>{place.whyInteresting}</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 100, textAlign: "center", background: "var(--moor)", color: "#fff", padding: "11px 0", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }}
            >
              Get Directions
            </a>
            <button
              onClick={onShowOnMap}
              style={{ flex: 1, minWidth: 100, background: "transparent", color: "var(--moor)", border: "1.5px solid var(--moor)", padding: "10px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Show on Map
            </button>
            <button
              onClick={onAnother}
              style={{ flex: 1, minWidth: 100, background: "var(--ochre)", color: "var(--ink)", border: "none", padding: "11px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              🎲 Another
            </button>
          </div>
          {place.officialWebsite && (
            <a
              href={place.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12.5, color: "var(--moor)", textDecoration: "underline" }}
            >
              Official website ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
