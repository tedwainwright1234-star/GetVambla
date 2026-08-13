export type GeocodedLocation = { lat: number; lng: number; displayName: string };

/**
 * Resolves a typed place name (town, county, postcode) to coordinates via
 * the app's own /api/geocode route. Returns null if not found - callers
 * should show a clear "couldn't find that place" message rather than
 * silently failing.
 */
export async function geocodeLocation(query: string): Promise<GeocodedLocation | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
