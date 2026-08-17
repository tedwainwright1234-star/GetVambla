import { NextRequest, NextResponse } from "next/server";

// Server-side route so we control the User-Agent and rate limiting
// properly, per Nominatim's usage policy, rather than calling it directly
// from the browser. Used by search when the user types a place name
// instead of using their current location (e.g. "castles in Bath").
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // No countrycodes restriction - the dataset now covers more than just
  // the UK & Ireland (Belgium/Brussels), so search needs to be able to
  // geocode anywhere. If you add data from a specific new country and
  // want to bias results toward it without excluding everywhere else,
  // Nominatim's countrycodes param can take a comma-separated list
  // rather than being removed entirely.
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
  })}`;

  try {
    const res = await fetch(url, {
      // A distinctive, non-placeholder User-Agent - Nominatim's servers
      // can reject requests using obviously-fake contact info.
      headers: { "User-Agent": "vambla-app-tedwa/1.0 (personal project)" },
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error(`Nominatim request failed: HTTP ${res.status} - ${bodyText.slice(0, 200)}`);
      return NextResponse.json({ error: `Geocoding service returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`Nominatim found no results for query: "${query}"`);
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    });
  } catch (err) {
    // This is what actually prints in your terminal running `npm run dev`
    // - check there for the real cause if this keeps happening.
    console.error("Geocode request threw an exception:", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
