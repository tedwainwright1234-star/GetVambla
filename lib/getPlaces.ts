import type { Place } from "./types";
import placesJson from "@/data/places.json";

/**
 * Data access layer for places.
 *
 * This is only the INITIAL bootstrap set shown before the map reports its
 * first viewport (see Explorer.tsx / MapView.tsx) - all real browsing,
 * panning, and category filtering goes through getPlacesInBounds() in
 * lib/getPlacesInBounds.ts instead, which is what stays fast at 10,000+
 * rows. Right now this just reads the bundled JSON file (the same 50
 * places from your CSV that already had coordinates). Once your full
 * dataset is in Supabase, swap the body of this function for the Supabase
 * version below.
 */
export async function getPlaces(): Promise<Place[]> {
  return (placesJson as any[]).map((row) => ({
    name: row.name,
    category: row.category,
    county: row.county,
    country: row.country,
    whyInteresting: row.whyInteresting ?? row.why_interesting ?? row.why ?? "",
    cost: row.cost ?? undefined,
    goodFor: row.goodFor ?? row.good_for ?? undefined,
    experienceCollections: row.experienceCollections ?? row.experience_collections ?? undefined,
    heritageCollections: row.heritageCollections ?? row.heritage_collections ?? undefined,
    imageUrl: row.imageUrl ?? row.image_url ?? undefined,
    officialWebsite: row.officialWebsite ?? row.official_website ?? undefined,
    lat: row.lat,
    lng: row.lng,
  }));
}

/* ---------------------------------------------------------------------
 * SUPABASE VERSION - uncomment once your table exists (see README.md),
 * and delete the JSON-based version above.
 *
 * import { supabase } from "./supabaseClient";
 *
 * export async function getPlaces(): Promise<Place[]> {
 *   const { data, error } = await supabase
 *     .from("places")
 *     .select("name, category, county, country, why_interesting, cost, good_for, experience_collections, heritage_collections, image_url, official_website, lat, lng");
 *
 *   if (error) {
 *     console.error("Failed to load places from Supabase:", error);
 *     return [];
 *   }
 *   return (data ?? []).map((row) => ({
 *     name: row.name,
 *     category: row.category,
 *     county: row.county,
 *     country: row.country,
 *     whyInteresting: row.why_interesting ?? "",
 *     cost: row.cost ?? undefined,
 *     goodFor: row.good_for ?? undefined,
 *     experienceCollections: row.experience_collections ?? undefined,
 *     heritageCollections: row.heritage_collections ?? undefined,
 *     imageUrl: row.image_url ?? undefined,
 *     officialWebsite: row.official_website ?? undefined,
 *     lat: row.lat,
 *     lng: row.lng,
 *   }));
 * }
 * ------------------------------------------------------------------- */
