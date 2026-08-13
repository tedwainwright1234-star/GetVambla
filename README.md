# vambla

Discover historical and natural wonders near you across the UK & Ireland.

This is a Next.js rebuild of the HTML prototype — same OS-map-inspired
design, same interactions (locate me, filter by category, click a place to
zoom in), but as a real app you can deploy and keep building on.

## Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy it

The fastest path is [Vercel](https://vercel.com) (made by the Next.js team,
free tier is plenty for this):

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import that repo.
3. Leave all settings as default and click Deploy.

If you later add Supabase (see below), add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as Environment Variables in the Vercel
project settings first.

## Project structure

```
app/
  layout.tsx        - root HTML shell, loads fonts/CSS
  page.tsx           - server component, fetches places, renders Explorer
  globals.css        - design tokens (colours, fonts) + Leaflet skinning
components/
  Explorer.tsx       - owns all state (filter, user location, focused place)
  Header.tsx         - logo + "find what's near me" button
  FilterChips.tsx    - category filter pills
  PlaceList.tsx       - sidebar list, sorted by distance once located
  MapView.tsx         - the actual Leaflet map (client-only, see note below)
lib/
  types.ts            - shared Place type
  getPlaces.ts        - data access layer (currently reads data/places.json)
  supabaseClient.ts    - Supabase client, unused until you wire it up
  distance.ts          - haversine distance helper
data/
  places.json           - the 50 places that already had coordinates
```

**Why MapView is dynamically imported with `ssr: false`** (in
`Explorer.tsx`): Leaflet reads `window` as soon as it's imported, which
crashes on Next.js's server-rendering pass. Loading it as a client-only
dynamic import sidesteps that entirely — you don't need to do anything
else for this, just keep any future map-related code inside MapView.tsx
or files it imports.

## Getting your full dataset in here

Right now `data/places.json` only has the 50 places from your original CSV
that already had coordinates. Once you've run the automation pipeline from
last time (`geocode_places.py` → `enrich_places.py`, or `run_pipeline.py`
for both in one go) on your full ~300-place list:

```bash
python3 -c "
import csv, json
with open('places_final.csv', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))
places = [{
    'name': r['Name'], 'category': r['Category'] or 'Other',
    'county': r['County'], 'country': r['Country'],
    'why': r['Why Interesting'], 'era': r['Era'],
    'lat': float(r['Latitude']), 'lng': float(r['Longitude']),
} for r in rows if r['Latitude'].strip()]
json.dump(places, open('data/places.json', 'w'))
"
```

That's fine up to a few hundred places. Past roughly 500–1000, loading one
giant JSON file on every request stops being a good idea — that's the
point to move to Supabase.

## Scaling to 10,000+ places

Three scripts in `scale/` (alongside the ones from before) handle this:

1. **`fetch_from_wikidata.py`** — pulls REAL places with real coordinates
   from Wikidata (castles, stone circles, hillforts, waterfalls, abbeys,
   historic houses, lighthouses, archaeological sites) across the UK and
   Ireland. This replaces asking Claude to invent new place names, which
   gets riskier the more places you ask for — Wikidata entries are
   verified entities, not model guesses, and coordinates come for free.
   Run: `python3 fetch_from_wikidata.py places_wikidata.csv`
2. **`enrich_places.py`** (updated) — now runs several Claude requests in
   parallel (`ENRICH_WORKERS` env var, default 8) so 10,000 rows doesn't
   take all day, and saves a checkpoint every 200 rows so a crash partway
   through doesn't lose progress. It also uses the `Wikidata Description`
   column as grounding — Claude paraphrases a real fact instead of
   inventing one from scratch.
3. **`supabase_schema.sql`** — the database schema, built for this scale
   from the start (see below).

Realistic workflow: run the Wikidata script per category, merge with your
existing 300 (dedupe by name), run enrich_places.py, then — this matters
more at 10,000 rows than 300 — do a **sampling** review rather than reading
every row: check a random 3–5% by hand, and if the error rate looks too
high, tighten the Claude prompt or re-run just the flagged rows.

## Moving to Supabase (recommended once the dataset is finished)

Airtable and a static JSON file are both fine for curating ~300 places, but
neither is built for "find everything within N miles of this point" at
scale. Supabase (hosted Postgres + PostGIS) is:

1. Create a free project at supabase.com.
2. In the SQL editor, paste and run the entire contents of
   `scale/supabase_schema.sql`. This creates the `places` table with
   PostGIS spatial indexing already set up, plus two functions the app
   calls: `nearby_places` (radius search) and `places_in_bounds` (used as
   you pan/zoom the map).
3. Import your final CSV via Supabase's Table Editor → Import data (it
   accepts CSV directly and maps columns for you — match your CSV's
   Name/Category/County/Country/Why Interesting/Era/Latitude/Longitude
   columns to the table's name/category/county/country/why/era/lat/lng).
4. Copy your Project URL and anon key into `.env.local` (see
   `.env.example`).
5. That's it — `lib/getPlacesInBounds.ts` already checks for those
   environment variables and switches from the bundled JSON file to real
   Supabase queries automatically. Nothing in the components needs to
   change.
6. The map already only asks for "what's visible right now"
   (`BoundsWatcher` inside `components/MapView.tsx`) rather than the whole
   table, and markers are clustered (`react-leaflet-cluster`) so thousands
   of pins in view still render smoothly.

## What's still missing for a production app

- **Mobile app**: this is a responsive website, not a native iOS/Android
  app. If you want App Store presence, the realistic paths are wrapping
  this site (Capacitor), or a separate React Native build reusing
  `lib/getPlaces.ts` and the data layer.
- **Search**: no text search yet, just category filters.
- **Auth/saved places**: none yet — add if you want users to bookmark
  wonders they want to visit.
- **Images**: no photos per place yet — you'll want at least one image per
  place for the map/list to feel complete; that's a separate sourcing
  task from the text fields (be careful with image licensing).
