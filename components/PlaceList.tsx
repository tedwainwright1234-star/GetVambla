"use client";

import type { Place } from "@/lib/types";
import { haversineKm, kmToMiles } from "@/lib/distance";

import { colorForCategory } from "@/lib/categoryStyle";
import SaveButton from "./SaveButton";

type Props = {
  places: Place[];
  userLoc: { lat: number; lng: number } | null;
  onSelect: (place: Place) => void;
};

export default function PlaceList({ places, userLoc, onSelect }: Props) {
  const withDistance = places.map((p) => ({
    ...p,
    dist: userLoc ? haversineKm(userLoc.lat, userLoc.lng, p.lat, p.lng) : null,
  }));
  if (userLoc) withDistance.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
      {withDistance.map((p) => (
        <div
          key={p.name}
          onClick={() => onSelect(p)}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--parchment-dark)",
            cursor: "pointer",
            borderLeft: `3px solid ${colorForCategory(p.category)}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'Bitter', serif", fontWeight: 700, fontSize: 15 }}>{p.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {p.dist !== null && (
                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: "var(--brick)", whiteSpace: "nowrap" }}>
                  {kmToMiles(p.dist).toFixed(1)} mi
                </span>
              )}
              <SaveButton placeName={p.name} size={16} />
            </div>
          </div>
          <div
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--moor-light)",
              margin: "3px 0 5px",
            }}
          >
            {p.category} · {p.county}{p.cost ? ` · ${p.cost}` : ""}
          </div>
          {p.whyInteresting && (
            <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "#3c4a3a" }}>{p.whyInteresting}</div>
          )}
          {p.experienceCollections && (
            <div style={{ fontSize: 10.5, color: "var(--ochre-dark)", marginTop: 4 }}>{p.experienceCollections}</div>
          )}
        </div>
      ))}
    </div>
  );
}
