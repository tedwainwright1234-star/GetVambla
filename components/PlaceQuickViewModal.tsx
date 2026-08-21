"use client";

import { useRouter } from "next/navigation";
import type { Place } from "@/lib/types";
import { colorForCategory } from "@/lib/categoryStyle";
import CategoryIcon from "./CategoryIcon";
import SaveButton from "./SaveButton";
import DirectionsButton from "./DirectionsButton";

type Props = {
  place: Place;
  onClose: () => void;
};

export default function PlaceQuickViewModal({ place, onClose }: Props) {
  const router = useRouter();
  const color = colorForCategory(place.category);
  const hasValidCoords = Number.isFinite(place.lat) && Number.isFinite(place.lng);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(28,37,48,0.55)",
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
          <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 21, color: "var(--ink)" }}>{place.name}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--moor-light)", marginTop: 3 }}>
                {place.category} · {place.county}{place.cost ? ` · ${place.cost}` : ""}
              </div>
            </div>
            <SaveButton placeName={place.name} size={24} />
          </div>

          {place.whyInteresting && (
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#3c4a3a", margin: "14px 0" }}>{place.whyInteresting}</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {hasValidCoords && <DirectionsButton lat={place.lat} lng={place.lng} label="Get Directions" />}
            {hasValidCoords && (
              <button
                onClick={() => router.push(`/map?place=${encodeURIComponent(place.name)}`)}
                style={{ flex: 1, minWidth: 120, background: "var(--ochre)", color: "var(--ink)", border: "none", padding: "11px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Show on Map
              </button>
            )}
          </div>
          <a
            href={`/place/${encodeURIComponent(place.name)}`}
            style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12.5, color: "var(--moor)", textDecoration: "underline" }}
          >
            View full details
          </a>
        </div>
      </div>
    </div>
  );
}
