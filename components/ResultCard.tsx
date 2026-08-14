"use client";

import type { Place } from "@/lib/types";
import { colorForCategory } from "@/lib/categoryStyle";
import CategoryIcon, { iconDefForCategory } from "./CategoryIcon";
import SaveButton from "./SaveButton";
import DirectionsButton from "./DirectionsButton";

type Props = {
  place: Place;
  distanceMiles: number | null;
  onShowOnMap: (p: Place) => void;
};

export default function ResultCard({ place, distanceMiles, onShowOnMap }: Props) {
  const color = colorForCategory(place.category);
  const hasValidCoords = Number.isFinite(place.lat) && Number.isFinite(place.lng);

  return (
    <div
      style={{
        display: "flex", gap: 14, background: "#fff", borderRadius: 12,
        boxShadow: "0 1px 6px rgba(28,37,48,0.08)", padding: 12, alignItems: "stretch",
      }}
    >
      <div style={{ width: 92, minWidth: 92, height: 92, borderRadius: 8, overflow: "hidden", background: place.imageUrl ? "#000" : `linear-gradient(135deg, ${color}dd, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {place.imageUrl ? (
          <img src={place.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        ) : (
          <div style={{ transform: "scale(1.6)" }}>
            <CategoryIconOnColor category={place.category} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontFamily: "'Bitter', serif", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{place.name}</span>
          <SaveButton placeName={place.name} size={18} />
        </div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--moor-light)", margin: "2px 0 4px" }}>
          {place.category} · {place.county}
          {distanceMiles !== null && ` · ${distanceMiles.toFixed(1)} mi`}
          {place.cost ? ` · ${place.cost}` : ""}
        </div>
        {place.whyInteresting && (
          <p style={{ fontSize: 12, lineHeight: 1.4, color: "#3c4a3a", margin: "0 0 8px", flex: 1 }}>{place.whyInteresting}</p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {hasValidCoords && <DirectionsButton lat={place.lat} lng={place.lng} compact />}
          {hasValidCoords && (
            <button
              onClick={() => onShowOnMap(place)}
              aria-label={`Show ${place.name} on the map`}
              style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, border: "1.5px solid var(--moor)", background: "transparent", color: "var(--moor)", cursor: "pointer" }}
            >
              Show on map
            </button>
          )}
          <a
            href={`/place/${encodeURIComponent(place.name)}`}
            style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, border: "1.5px solid var(--ochre-dark)", background: "transparent", color: "var(--ochre-dark)", textDecoration: "none" }}
          >
            View details
          </a>
        </div>
      </div>
    </div>
  );
}

function CategoryIconOnColor({ category }: { category: string }) {
  const def = iconDefForCategory(category);
  return (
    <svg viewBox={def.viewBox} width={22} height={22} fill="#fff" stroke="none">
      {def.paths.map((d, i) => <path key={i} d={d} fillRule="evenodd" />)}
    </svg>
  );
}
