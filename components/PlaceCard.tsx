"use client";

import type { Place } from "@/lib/types";
import { colorForCategory } from "@/lib/categoryStyle";
import CategoryIcon, { iconDefForCategory } from "./CategoryIcon";
import SaveButton from "./SaveButton";

type Props = {
  place: Place;
  onClick?: () => void;
};

export default function PlaceCard({ place, onClick }: Props) {
  const color = colorForCategory(place.category);
  const firstCollection = place.experienceCollections?.split(",")[0]?.trim();

  return (
    <div
      onClick={onClick}
      style={{
        width: 240,
        flexShrink: 0,
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(28,37,48,0.10)",
        cursor: onClick ? "pointer" : "default",
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(28,37,48,0.16)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(28,37,48,0.10)"; }}
    >
      {/* Real photo when we have one, otherwise the category-colour placeholder */}
      <div
        style={{
          height: 130,
          background: place.imageUrl ? "#000" : `linear-gradient(135deg, ${color}dd, ${color}99)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {place.imageUrl ? (
          <img
            src={place.imageUrl}
            alt={place.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div style={{ transform: "scale(2.2)" }}>
            <CategoryIconOnWhite category={place.category} />
          </div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: 20 }}>
            <SaveButton placeName={place.name} size={18} />
          </div>
        </div>
        {firstCollection && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "rgba(28,37,48,0.75)",
              color: "#fff",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9.5,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 20,
            }}
          >
            {firstCollection}
          </span>
        )}
      </div>

      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontFamily: "'Bitter', serif", fontWeight: 700, fontSize: 14.5, color: "var(--ink)", marginBottom: 2 }}>
          {place.name}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9.5,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--moor-light)",
            marginBottom: 6,
          }}
        >
          {place.category} · {place.county}{place.cost ? ` · ${place.cost}` : ""}
        </div>
        {place.whyInteresting && (
          <div style={{ fontSize: 12, lineHeight: 1.4, color: "#3c4a3a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {place.whyInteresting}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryIconOnWhite({ category }: { category: string }) {
  const def = iconDefForCategory(category);
  return (
    <svg width={24} height={24} viewBox={def.viewBox} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {def.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
