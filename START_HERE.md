# START HERE — Vambla Handover

## What Vambla is
A discovery platform (live at **vambla.com**) for finding remarkable historic and
natural places across the UK & Ireland — castles, ruins, historic pubs, abbeys,
viewpoints, beaches, and more. Explicitly NOT a navigation app like Google Maps —
the point is "I never knew that existed," not turn-by-turn directions.
Motto (in the logo): "Discover remarkable places hiding in plain sight."

## Architecture
- **Framework**: Next.js 15.5.21 (App Router), React 18, TypeScript
- **Styling**: plain inline styles + `app/globals.css` (no Tailwind) — brand
  palette is navy/gold/cream ("ink"/"ochre"/"parchment" CSS variables)
- **Fonts**: Bitter (serif, headings/place names), Nunito (rounded sans, UI
  labels/nav — deliberately NOT monospace, that was changed from IBM Plex Mono
  after user feedback it looked "typewriter style")
- **Map**: Leaflet + react-leaflet + react-leaflet-cluster
- **Data**: Supabase (Postgres + PostGIS), table `places`. Falls back to a small
  bundled `data/places.json` sample (~50 rows) if Supabase env vars aren't set —
  this fallback is for local dev safety only, NOT the real dataset.
- **Deployment**: GitHub → Vercel (auto-deploys on push to `main`) → vambla.com
  via Cloudflare DNS (CNAME records, proxy disabled/grey-cloud)
- **No auth/accounts yet** — Wishlist/Save uses browser localStorage, not a
  user database

## Current file structure (all under the zipped project root)
```
app/
  page.tsx                 Discover homepage (server component, fetches
                            collection previews via lib/discover.ts)
  layout.tsx                Root layout, loads fonts
  globals.css               All styling, CSS variables, responsive rules
  icon.png                  Favicon (Next.js App Router auto-picks this up)
  map/page.tsx               Full-screen map page, wraps Explorer.tsx
  category/[name]/page.tsx  Category results page (list/map toggle,
                            radius search, geocoded location search)
  place/[name]/page.tsx     Individual place detail page
  wishlist/page.tsx          Saved places (reads localStorage)
  api/geocode/route.ts       Server-side Nominatim geocoding proxy
components/
  DiscoverHome.tsx           Homepage: hero, search, collections, category grid
  CategoryGrid.tsx           The category tile grid on the homepage
  CategoryIcon.tsx           Custom SVG icon per category (bold solid
                              silhouettes, redesigned twice for clarity)
  Explorer.tsx                Map page's state owner (filters, search, radius)
  MapView.tsx                 The actual Leaflet map: markers, clustering,
                              style switcher (Street/Satellite/Hybrid via
                              free Esri layers), zoom control, legend,
                              hover tooltips, popups
  MobileMapControls.tsx      Floating search+filter+clear-location bar shown
                              ONLY on mobile map view (sidebar is hidden there)
  MapLegend.tsx                Collapsible category key (defaults collapsed)
  PlaceCard.tsx / ResultCard.tsx / PlaceList.tsx   Various place list/card views
  PlaceQuickViewModal.tsx / SurpriseMeModal.tsx    Popup modals with
                              Directions/Show on Map/Save
  DirectionsButton.tsx        Opens Google Maps universal directions link
  Nav.tsx / Header.tsx         Top/bottom nav (Discover/Map/Wishlist) and the
                              map page's own header
lib/
  types.ts                    The Place type — the canonical field list
  getPlacesInBounds.ts         Main Supabase query layer (bounds, nearby,
                              by-name, by-names, search)
  discover.ts                  Random/collection queries for the homepage
  searchParser.ts               Rule-based "castles in North Yorkshire" parser
  geocodeLocation.ts             Client helper calling /api/geocode
  collections.ts                 Nearby-collection definitions (Hidden Gems,
                              Viewpoints, Historic Pubs, Castles, Ruins, Free,
                              Scenic, Rainy-day — all derived from existing
                              data fields, nothing invented)
  categoryStyle.ts               Category → colour mapping
  wishlist.ts                    localStorage save/unsave logic
scale/
  (Python data pipeline scripts — sourcing, enrichment, image-fetching,
  classification. NOT part of the running app, used offline to prepare CSVs
  that get imported into Supabase.)
public/
  vambla-icon.png / vambla-logo.png / vambla-logo-compact.png
                                Logo assets (transparent V mark, various crops)
```

## Data model (Supabase table `places`)
Columns: `name, category, county, country, lat, lng, why_interesting, cost,
good_for, experience_collections, heritage_collections, image_url,
official_website, editorial_review`.
- `cost`: 'Free' / '£' / '££' / '£££' / blank if unknown
- `good_for`, `experience_collections`, `heritage_collections`: comma-separated
  free text (e.g. "Families, Photographers", "Hidden Gem, Great Views")
- `editorial_review`: 'Keep' / 'Review' / 'Remove' — the app should filter out
  'Remove' rows (this is enforced in the SQL functions, e.g. `random_places`)
- Roughly 4,800+ rows across ~30 categories (Castle, Ruin, Historic Pub,
  Stately Home, Abbey/Priory, Historic Building, Church, Fort, Roman History,
  Bridge, Lighthouse, Windmill, Beach, Viewpoint, Stone Circle, plus Natural
  Beauty subtypes: Waterfall, River, Lake, Mountain, Woodland, Forest, Moor,
  Rock Formation, Valley, Cliffs, Hill, Island, Wetland, Nature Reserve)
- Image coverage: ~88% after the coordinate-based sourcing pass (Wikipedia
  pageimages + Wikimedia Commons geosearch + OSM image tags, all with
  person/topic verification to avoid wrong matches)
- SQL functions in `scale/supabase_schema.sql`: `nearby_places`,
  `places_in_bounds`, `random_places` (supports `require_image` flag)

## Key product decisions (do not reverse without asking)
- Nearby = 30 miles by default, everywhere
- Homepage collections only show places WITH a real photo (`require_image`)
- Collections are capped at 30 places each
- Category icons are custom bold solid-silhouette SVGs — NOT emoji, NOT
  thin line-art (was simplified from an earlier more-detailed version after
  feedback it was "too complicated")
- Search parses "category in location" via rules, not AI — see
  `lib/searchParser.ts`. Location search must use the TYPED location, never
  silently fall back to device geolocation (this was a real bug, now fixed)
- Directions use the universal Google Maps web URL (works cross-platform);
  no native app-scheme detection
- Never fabricate data — blank is correct when uncertain (applies to cost,
  images, facts, coordinates alike)
- Map auto-loads places on pan/zoom with a 900ms debounce (deliberately long —
  a shorter debounce previously caused an out-of-memory crash from repeated
  re-clustering of up to 3,000 markers; the per-fetch limit was also reduced
  to 400)

## Recent changes (most recent first)
1. Added `app/icon.png` as the browser favicon (Next.js auto-detects this path)
2. Simplified all category icons to bold single/dual-path solid silhouettes
   (`components/CategoryIcon.tsx`); switched map markers/cards from stroke to
   fill rendering to match
3. Fixed three real mobile map bugs: map was locked to 45vh even with the list
   hidden (now `flex:1`); zoom control overlapped the search bar (moved to
   bottom-right); no way to clear an active location search on mobile (added
   a clear button to `MobileMapControls.tsx`)
4. Replaced the top-left row of map style buttons with a compact Google
   Maps-style "layers" button, bottom-right; map legend now defaults collapsed
5. Swapped IBM Plex Mono (looked "typewriter style") for Nunito app-wide (27
   occurrences across 15 files); added the real logo (extracted/cropped from
   a user-supplied image) to the header
6. Reordered homepage: collections first, category grid last; added
   click-to-quick-view modal on place cards (Directions/Show on Map/Save);
   expanded nearby collections to include Viewpoints and Ruins, capped at 30
7. Built `/category/[name]` results page (list/map toggle, radius selector,
   geocoded or device location) and `/place/[name]` detail page
8. Built the coordinate-based image sourcing pipeline
   (`scale/fetch_images_by_coordinates.py`) — Wikimedia Commons geosearch +
   OSM tags, with name-matching and person-detection verification, after the
   earlier Wikipedia-only script wrongly matched some pub names to unrelated
   famous people/places (e.g. "Princess Royal" pub → royal title photo)

## Known issues / things not yet done
- No automated tests exist
- I (this Claude instance) cannot run `npm install`/`npm run build` myself —
  no internet access in my sandbox. Every change has been verified by brace/
  paren balance checks and manual review, NOT an actual compile. The user
  runs the real build after every handoff.
- Autocomplete suggestions for search (categories/counties/places) were never
  built — the parser exists, but there's no live suggestions dropdown UI
- No individual "Similar Places" / "Nearby Places" recommendations on the
  place detail page yet
- No Weekend Planner / itinerary builder (explicitly scoped out as a separate
  future feature, not started)
- Wishlist is device-local only (localStorage) — no accounts, no cross-device
  sync; this was a deliberate phased decision, not an oversight
- ~12% of places still have no image (the genuinely hard tail after
  Wikipedia + Commons + OSM); Google Places API was discussed as the next
  option but not built (needs billing/API key setup)
- Historic pub images specifically were the most error-prone category
  (common names collide with famous people/ships/places) — verification
  logic exists but isn't infallible; user mentioned some pub photos may
  still be wrong

## Next priorities (as discussed, not invented)
**High**: keep an eye on the mobile map memory fix holding up under real use;
close remaining image gaps if the user wants to pursue Google Places API.
**Medium**: Irish pub dataset expansion (~250 pubs, Republic of Ireland =
Country "Ireland", Northern Ireland = Country "United Kingdom") — discussed
as upcoming work but not yet started in this codebase.
**Later**: Similar/Nearby Places on detail pages, autocomplete search UI,
Weekend Planner, real user accounts for Wishlist.

## Environment variables (see `.env.example` in the zip)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for
  real data; without them the app silently falls back to the tiny JSON sample
- `NEXT_PUBLIC_MAPTILER_KEY` — NOT currently used (Hybrid map was rebuilt on
  free keyless Esri layers instead); this var can likely be removed, left in
  case it's referenced anywhere stale

## Commands
```
npm install
npm run dev      # http://localhost:3000 (or next available port)
npm run build
npm run lint
```

## Deployment
GitHub repo → Vercel (auto-deploy on push to `main`) → vambla.com (Cloudflare
DNS, two CNAME records, proxy OFF/grey-cloud). No CI/tests currently gate
deployment — a broken build on Vercel is the first real signal of an error.
