import { supabase } from "./supabaseClient";
import type { Place } from "./types";
import placesJson from "@/data/places.json";

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
 * Random places, optionally filtered by category or collection tag (e.g.
 * "Hidden Gem", "Bucket List"). Powers Surprise Me and the Discover
 * homepage's rotating sections. Falls back to a client-side random pick
 * from the bundled sample JSON until Supabase is wired up.
 */
export async function getRandomPlaces(
  opts: { category?: string; collection?: string; count?: number; requireImage?: boolean } = {}
): Promise<Place[]> {
  const count = opts.count ?? 1;

  if (hasSupabase) {
    const { data, error } = await supabase.rpc("random_places", {
      category_filter: opts.category ?? null,
      collection_filter: opts.collection ?? null,
      limit_count: count,
      require_image: opts.requireImage ?? false,
    });
    if (error) {
      console.error("Failed to load random places:", error);
      return [];
    }
    return (data ?? []).map(rowToPlace);
  }

  let pool = (placesJson as any[]).map(rowToPlace);
  if (opts.category) pool = pool.filter((p) => p.category === opts.category);
  if (opts.collection) {
    pool = pool.filter(
      (p) =>
        p.experienceCollections?.includes(opts.collection!) ||
        p.heritageCollections?.includes(opts.collection!)
    );
  }
  if (opts.requireImage) pool = pool.filter((p) => p.imageUrl);
  // shuffle and take `count`
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
