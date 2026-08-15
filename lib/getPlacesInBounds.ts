import { supabase } from "./supabaseClient";
import type { Place } from "./types";
import placesJson from "@/data/places.json";

export type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };

// Used whenever we want "everywhere" rather than a specific viewport -
// e.g. a category search with no location typed ("castles" should mean
// every castle in the UK & Ireland, not just what's currently on screen).
export const WORLD_BOUNDS: Bounds = { minLat: -90, minLng: -180, maxLat: 90, maxLng: 180 };

export type CategoryFilter = string | string[] | null;

// Accepts a single category, an array (multi-select), or null/"All", and
// always returns a clean array with no "All" placeholder in it.
function normalizeCategories(category: CategoryFilter): string[] {
  if (!category) return [];
  const list = Array.isArray(category) ? category : [category];
  return list.filter((c) => c && c !== "All");
}

// Supabase RPC params still take a single `text` value - a comma-joined
// list doubles as "any of these categories" once the SQL function does
// `category = ANY(string_to_array(category_filter, ','))` (see
// scale/supabase_schema.sql). A single category still works exactly as
// before, since string_to_array on a one-item string is a one-item array.
function toCategoryFilterParam(categories: string[]): string | null {
  return categories.length ? categories.join(",") : null;
}

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
export async function getPlacesInBounds(bounds: Bounds, category: CategoryFilter): Promise<Place[]> {
  const categories = normalizeCategories(category);

  // Multiple categories: query each one separately and merge, rather than
  // sending a comma-joined value and relying on the database function
  // understanding it (that needs a one-time SQL migration - see
  // scale/supabase_schema.sql - which may not have been applied yet).
  // This way multi-category selection works immediately regardless of
  // whether that migration has been run.
  if (categories.length > 1) {
    const results = await Promise.all(categories.map((c) => getPlacesInBounds(bounds, c)));
    const merged = new Map<string, Place>();
    for (const list of results) for (const p of list) merged.set(p.name, p);
    return Array.from(merged.values());
  }

  if (hasSupabase) {
    const { data, error } = await supabase.rpc("places_in_bounds", {
      min_lat: bounds.minLat,
      min_lng: bounds.minLng,
      max_lat: bounds.maxLat,
      max_lng: bounds.maxLng,
      category_filter: toCategoryFilterParam(categories),
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
        (categories.length === 0 || categories.includes(p.category))
    )
    .map(rowToPlace);
}

/**
 * Every place matching one or more categories, nationwide (UK & Ireland) -
 * no viewport or location involved. This is what makes typing "castles"
 * show every castle rather than just whatever's currently on screen.
 */
export async function getPlacesByCategories(categories: string[]): Promise<Place[]> {
  return getPlacesInBounds(WORLD_BOUNDS, categories);
}

/**
 * Fetches places within a radius (miles) of a point - powers "Explore Near
 * Me" and the 5/10/20/30/50/100-mile radius selector. Falls back to a
 * simple haversine filter on the bundled JSON until Supabase is wired up.
 */
export async function getPlacesNearby(
  center: { lat: number; lng: number },
  radiusMiles: number,
  category: CategoryFilter
): Promise<Place[]> {
  const categories = normalizeCategories(category);

  // Same reasoning as getPlacesInBounds above - query each category
  // separately and merge, so multi-category works without depending on
  // a database-side migration having been applied.
  if (categories.length > 1) {
    const results = await Promise.all(categories.map((c) => getPlacesNearby(center, radiusMiles, c)));
    const merged = new Map<string, Place>();
    for (const list of results) for (const p of list) merged.set(p.name, p);
    return Array.from(merged.values());
  }

  if (hasSupabase) {
    const { data, error } = await supabase.rpc("nearby_places", {
      center_lat: center.lat,
      center_lng: center.lng,
      radius_km: radiusMiles * 1.60934,
      category_filter: toCategoryFilterParam(categories),
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
    .filter((p) => categories.length === 0 || categories.includes(p.category))
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
 * Resolves a search string to a single place ONLY if it's an exact
 * (case-insensitive) name match - e.g. "Bamburgh Castle" or "tintagel".
 * Used to short-circuit search submission: if what was typed IS a real
 * place, we zoom straight to it rather than running it through the
 * category/location parser and geocoding it as an area, which used to
 * force an unwanted radius search around it.
 */
export async function findExactPlaceMatch(query: string): Promise<Place | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (hasSupabase) {
    const { data, error } = await supabase
      .from("places")
      .select("name, category, county, country, why_interesting, cost, good_for, experience_collections, heritage_collections, image_url, official_website, lat, lng")
      // .ilike with no % wildcards still does a case-insensitive exact
      // match - exactly what we want here, nothing fuzzy.
      .ilike("name", trimmed)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return rowToPlace(data);
  }

  const match = (placesJson as any[]).find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  return match ? rowToPlace(match) : null;
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
