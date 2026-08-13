import { supabase } from "./supabaseClient";
import type { Place } from "./types";
import placesJson from "@/data/places.json";

export type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };

const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

function rowToPlace(row: any): Place {
  return {
    name: row.name,
    category: row.category,
    county: row.county,
    country: row.country,
    whyInteresting: row.why_interesting ?? row.why ?? "",
    cost: row.cost ?? undefined,
    goodFor: row.good_for ?? undefined,
    experienceCollections: row.experience_collections ?? undefined,
    heritageCollections: row.heritage_collections ?? undefined,
    imageUrl: row.image_url ?? undefined,
    officialWebsite: row.official_website ?? undefined,
    lat: row.lat,
    lng: row.lng,
  };
}

/**
 * Fetches places within the current map viewport. This is what makes a
 * 10,000+ row dataset workable: the app never asks for "all places", only
 * "what's in view right now" - Supabase's spatial index (see
 * scale/supabase_schema.sql) answers that in milliseconds no matter how
 * big the table gets.
 *
 * Until NEXT_PUBLIC_SUPABASE_URL is set, this falls back to filtering the
 * bundled sample JSON file client-side, so the app keeps working exactly
 * as before while you're getting the real dataset into Supabase.
 */
export async function getPlacesInBounds(bounds: Bounds, category: string | null): Promise<Place[]> {
  if (hasSupabase) {
    const { data, error } = await supabase.rpc("places_in_bounds", {
      min_lat: bounds.minLat,
      min_lng: bounds.minLng,
      max_lat: bounds.maxLat,
      max_lng: bounds.maxLng,
      category_filter: category && category !== "All" ? category : null,
      limit_count: 400,
    });
    if (error) {
      console.error("Failed to load places from Supabase:", error);
      return [];
    }
    return (data ?? []).map(rowToPlace);
  }

  return (placesJson as any[])
    .filter(
      (p) =>
        p.lat >= bounds.minLat &&
        p.lat <= bounds.maxLat &&
        p.lng >= bounds.minLng &&
        p.lng <= bounds.maxLng &&
        (!category || category === "All" || p.category === category)
    )
    .map(rowToPlace);
}

/**
 * Fetches places within a radius (miles) of a point - powers "Explore Near
 * Me" and the 5/10/20/30/50/100-mile radius selector. Falls back to a
 * simple haversine filter on the bundled JSON until Supabase is wired up.
 */
export async function getPlacesNearby(
  center: { lat: number; lng: number },
  radiusMiles: number,
  category: string | null
): Promise<Place[]> {
  if (hasSupabase) {
    const { data, error } = await supabase.rpc("nearby_places", {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_km: radiusMiles * 1.60934,
      category_filter: category && category !== "All" ? category : null,
      limit_count: 400,
    });
    if (error) {
      console.error("Failed to load nearby places from Supabase:", error);
      return [];
    }
    return (data ?? []).map(rowToPlace);
  }

  const radiusKm = radiusMiles * 1.60934;
  return (placesJson as any[])
    .filter((p) => haversineKm(center.lat, center.lng, p.lat, p.lng) <= radiusKm)
    .filter((p) => !category || category === "All" || p.category === category)
    .map(rowToPlace);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetches a single place by exact name - used by the place detail page.
 */
export async function getPlaceByName(name: string): Promise<Place | null> {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from("places")
      .select("name, category, county, country, why_interesting, cost, good_for, experience_collections, heritage_collections, image_url, official_website, lat, lng")
      .eq("name", name)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return rowToPlace(data);
  }

  const match = (placesJson as any[]).find((p) => p.name === name);
  return match ? rowToPlace(match) : null;
}

/**
 * Fetches multiple places by exact name - used by the Wishlist page to
 * load full place data for whatever's saved in localStorage.
 */
export async function getPlacesByNames(names: string[]): Promise<Place[]> {
  if (names.length === 0) return [];

  if (hasSupabase) {
    const { data, error } = await supabase
      .from("places")
      .select("name, category, county, country, why_interesting, cost, good_for, experience_collections, heritage_collections, image_url, official_website, lat, lng")
      .in("name", names);
    if (error) {
      console.error("Failed to load saved places:", error);
      return [];
    }
    return (data ?? []).map(rowToPlace);
  }

  return (placesJson as any[])
    .filter((p) => names.includes(p.name))
    .map(rowToPlace);
}

/**
 * Full-dataset name search (not viewport-limited) - used by the search box
 * so typing "Tintagel" finds it even if it's off-screen.
 */
export async function searchPlacesByName(query: string): Promise<Place[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  if (hasSupabase) {
    const { data, error } = await supabase
      .from("places")
      .select("name, category, county, country, why_interesting, cost, good_for, experience_collections, heritage_collections, image_url, official_website, lat, lng")
      .ilike("name", `%${trimmed}%`)
      .limit(20);
    if (error) {
      console.error("Search failed:", error);
      return [];
    }
    return (data ?? []).map(rowToPlace);
  }

  return (placesJson as any[])
    .filter((p) => p.name.toLowerCase().includes(trimmed))
    .slice(0, 20)
    .map(rowToPlace);
}
