"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";
import { useWishlist } from "@/lib/wishlist";
import { getPlacesByNames } from "@/lib/getPlacesInBounds";
import { TopNav, BottomNav } from "@/components/Nav";
import PlaceCard from "@/components/PlaceCard";

export default function WishlistPage() {
  const savedNames = useWishlist();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlacesByNames(savedNames).then((p) => {
      setPlaces(p);
      setLoading(false);
    });
  }, [savedNames]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", paddingBottom: 70 }}>
      <TopNav />
      <div style={{ padding: "28px 20px 10px" }}>
        <h1 style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 26, color: "var(--ink)", margin: 0 }}>
          Your Wishlist
        </h1>
        <p style={{ fontSize: 13, color: "var(--moor-light)", marginTop: 4 }}>
          Saved on this device — {places.length} place{places.length === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "20px", color: "var(--moor-light)" }}>Loading…</div>
      ) : places.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--moor-light)" }}>
          Nothing saved yet — tap the heart on any place to add it here.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "10px 20px 20px" }}>
          {places.map((p) => (
            <PlaceCard key={p.name} place={p} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
