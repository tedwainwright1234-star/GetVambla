"use client";

import type { Place } from "@/lib/types";
import PlaceCard from "./PlaceCard";

type Props = {
  title: string;
  subtitle?: string;
  places: Place[];
  onSelectPlace?: (p: Place) => void;
  loading?: boolean;
};

export default function CollectionRow({ title, places, onSelectPlace, loading }: Props) {
  if (!loading && places.length === 0) return null;

  return (
    <section style={{ padding: "22px 0 6px" }}>
      <div style={{ padding: "0 20px", marginBottom: 12 }}>
        <h2 style={{ fontFamily: "'Bitter', serif", fontWeight: 700, fontSize: 19, color: "var(--ink)", margin: 0 }}>
          {title}
        </h2>
      </div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 20px 10px", scrollbarWidth: "thin" }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ width: 240, height: 210, flexShrink: 0, background: "var(--parchment-dark)", borderRadius: 14, opacity: 0.6 }} />
            ))
          : places.map((p) => (
              <PlaceCard key={p.name} place={p} onClick={() => onSelectPlace?.(p)} />
            ))}
      </div>
    </section>
  );
}
