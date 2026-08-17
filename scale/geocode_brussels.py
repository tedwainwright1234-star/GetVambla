"""
geocode_brussels.py
--------------------
Fills in missing lat/lng for a places CSV (matches your Brussels export
schema: name, category, county, country, why_interesting, lat, lng,
image_url, Source URL).

Three-stage lookup, most reliable first:
  1. If "Source URL" is a Wikipedia article, pull the EXACT coordinates
     Wikipedia has for that page (via its own coordinates API) - more
     reliable than text-search geocoding for a named landmark, and
     avoids an extra network round trip's worth of ambiguity.
  2. Otherwise, free-text search against OpenStreetMap's Nominatim
     geocoder, built from name + category + city + county + country
     (most specific combination first, falling back through less
     specific ones - see build_nominatim_queries). CITY_HINT ("Brussels"
     below) is included explicitly, because the "county" column in this
     dataset actually holds micro-district names (e.g. "Grand-Place /
     Ilot Sacre") that Nominatim generally doesn't recognise on their
     own - the real city name matters a lot for a free-text geocoder.
  3. If Nominatim still finds nothing, search Wikipedia by name (+ city)
     and pull coordinates from the best-matching article - but ONLY if
     its title is a close match to the place name (titles_match), same
     safeguard as fetch_images_brussels.py, so an unrelated/loosely
     similar article can't quietly attach the wrong coordinates.

USAGE:
    python3 geocode_brussels.py places.csv places_geocoded.csv

    Already have a partially-geocoded file (e.g. from a previous run)?
    Just pass THAT as the input - rows that already have lat+lng are
    skipped, so re-running only retries the ones still missing.

WHAT IT DOES:
    - Skips any row that already has lat + lng (safe to re-run/resume).
    - Never invents a location: rows it still can't confidently match
      after all three tiers are left blank and flagged "no_match" in a
      new geocode_status column for a human to check by hand.
    - Checkpoints every 10 rows, so a crash or interrupted run doesn't
      lose progress. Ctrl+C also saves a checkpoint before exiting.
    - A single row's error is logged and skipped - it will NOT crash the
      whole run. If several requests fail in a row, that usually means
      something systemic (wrong User-Agent, no internet, IP blocked)
      rather than one bad row, so the script stops itself early with a
      clear message instead of grinding uselessly through the rest.

RATE LIMITS (don't remove these - both providers WILL block you without them):
    - Wikipedia API: no hard limit, but ~0.3s between calls is polite.
    - Nominatim: STRICTLY max 1 request/second.

Always spot-check a sample of results on a map before publishing -
geocoders occasionally return the centre of a whole district, or a
like-named place in the wrong country.
"""

import csv
import difflib
import re
import sys
import time
import traceback
import urllib.request
import urllib.parse
import json

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
WIKI_API = "https://{lang}.wikipedia.org/w/api.php"

HEADERS = {"User-Agent": "vambla-app-geocoder/1.0 (contact: tedwainwright1234@gmail.com)"}

PLACEHOLDER_EMAIL = "you@example.com"

# The real city these places are in - used to qualify both the Nominatim
# and Wikipedia-search queries. Change this if you reuse the script for
# a different city/dataset.
CITY_HINT = "Brussels"

MAX_CONSECUTIVE_ERRORS = 5

COUNTRY_CODES = {
    "belgium": "be",
    "united kingdom": "gb",
    "uk": "gb",
    "england": "gb",
    "scotland": "gb",
    "wales": "gb",
    "northern ireland": "gb",
    "ireland": "ie",
    "france": "fr",
    "netherlands": "nl",
    "germany": "de",
}

WIKI_URL_RE = re.compile(r"https?://([a-z]{2,3})\.wikipedia\.org/wiki/([^?#]+)")


def wikipedia_title_from_url(url: str):
    """Return (lang, title) if url is a Wikipedia article, else None."""
    m = WIKI_URL_RE.match((url or "").strip())
    if not m:
        return None
    lang, title = m.group(1), urllib.parse.unquote(m.group(2)).replace("_", " ")
    return lang, title


def geocode_from_wikipedia(lang: str, title: str):
    """Pull the coordinates Wikipedia itself has for this exact article."""
    params = {
        "action": "query",
        "prop": "coordinates",
        "titles": title,
        "format": "json",
        "formatversion": "2",
    }
    url = f"{WIKI_API.format(lang=lang)}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    pages = data.get("query", {}).get("pages", [])
    if not pages or "coordinates" not in pages[0]:
        return None
    coord = pages[0]["coordinates"][0]
    return float(coord["lat"]), float(coord["lon"])


def wikipedia_search(lang: str, query: str):
    """Returns a list of candidate article titles for a free-text query."""
    params = {
        "action": "opensearch",
        "search": query,
        "limit": 3,
        "namespace": 0,
        "format": "json",
    }
    url = f"https://{lang}.wikipedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    return data[1] if len(data) > 1 else []


def _normalize_title(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().replace("-", " ").replace("_", " ")).strip()


def titles_match(name: str, title: str) -> bool:
    """Conservative similarity check - guards against wrong-place matches.
    Rejecting a borderline match (leaving it for manual review) is always
    preferable to silently attaching the wrong coordinates to a place.
    Compares both the full title and the title with a trailing ", City"
    style disambiguator stripped (Wikipedia's real title for this
    landmark is "Grand Place, Brussels" - that should count as a match
    for a CSV row named "Grand-Place", not get rejected over punctuation)."""
    a = _normalize_title(name)
    candidates = {_normalize_title(title), _normalize_title(title.split(",")[0])}
    for b in candidates:
        if a == b or a in b or b in a:
            return True
        if difflib.SequenceMatcher(None, a, b).ratio() >= 0.82:
            return True
    return False


def geocode_from_nominatim(query: str, country_code: str = None):
    params = {"q": query, "format": "json", "limit": 1}
    if country_code:
        params["countrycodes"] = country_code
    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    if not data:
        return None
    best = data[0]
    return float(best["lat"]), float(best["lon"])


def build_nominatim_queries(row):
    name = row["name"].strip()
    category = row.get("category", "").strip()
    county = row.get("county", "").strip()
    country = row.get("country", "").strip()
    candidates = []
    # Most specific/most likely to actually work first: the real city
    # name (CITY_HINT) rather than the micro-district in "county", which
    # Nominatim usually won't recognise as a standalone place name.
    if name and category and CITY_HINT and country:
        candidates.append(f"{name}, {category}, {CITY_HINT}, {country}")
    if name and CITY_HINT and country:
        candidates.append(f"{name}, {CITY_HINT}, {country}")
    if name and category and county and country:
        candidates.append(f"{name}, {category}, {county}, {country}")
    if name and county and country:
        candidates.append(f"{name}, {county}, {country}")
    if name and category and country:
        candidates.append(f"{name}, {category}, {country}")
    if name and country:
        candidates.append(f"{name}, {country}")
    if name:
        candidates.append(name)
    return candidates


def geocode_row(row):
    """Returns (lat, lng, source, had_error). had_error means a genuine
    network/API error occurred (as opposed to a clean 'no results')."""
    had_error = False
    name = row["name"].strip()

    # Tier 1: exact Wikipedia article, if we have one.
    wiki = wikipedia_title_from_url(row.get("Source URL", ""))
    if wiki:
        lang, title = wiki
        try:
            result = geocode_from_wikipedia(lang, title)
            if result:
                return result[0], result[1], "wikipedia_coords", False
        except Exception as e:
            print(f"  [wikipedia error] {name!r}: {type(e).__name__}: {e}")
            had_error = True
        time.sleep(0.3)

    # Tier 2: Nominatim free-text search.
    country_code = COUNTRY_CODES.get(row.get("country", "").strip().lower())
    for query in build_nominatim_queries(row):
        try:
            result = geocode_from_nominatim(query, country_code)
        except Exception as e:
            print(f"  [nominatim error] {name!r}: {type(e).__name__}: {e}")
            had_error = True
            result = None
        time.sleep(1.1)  # Nominatim: max 1 req/sec, strictly
        if result:
            return result[0], result[1], "nominatim", False

    # Tier 3: search Wikipedia by name (Nominatim came up empty) and pull
    # coordinates from the best-matching article, but only if the title
    # is genuinely close to the place name.
    search_queries = [f"{name}, {CITY_HINT}"] if CITY_HINT else []
    search_queries.append(name)
    candidates = []
    for q in search_queries:
        try:
            candidates = wikipedia_search("en", q)
        except Exception as e:
            print(f"  [wiki search error] {name!r}: {type(e).__name__}: {e}")
            had_error = True
            candidates = []
        time.sleep(0.3)
        if candidates:
            break

    for candidate_title in candidates:
        if not titles_match(name, candidate_title):
            continue
        try:
            result = geocode_from_wikipedia("en", candidate_title)
        except Exception as e:
            print(f"  [wikipedia error] {name!r}: {type(e).__name__}: {e}")
            had_error = True
            result = None
        time.sleep(0.3)
        if result:
            return result[0], result[1], "wikipedia_search", False

    return None, None, None, had_error


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 geocode_brussels.py <input.csv> <output.csv>")
        sys.exit(1)

    if PLACEHOLDER_EMAIL in HEADERS["User-Agent"]:
        print("=" * 70)
        print("STOP: you need to edit HEADERS at the top of this script first.")
        print(f'Replace "{PLACEHOLDER_EMAIL}" with a real email address.')
        print("Nominatim's usage policy blocks every request with a")
        print("placeholder/generic User-Agent.")
        print("=" * 70)
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]

    with open(in_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    for col in ("geocode_source", "geocode_status"):
        if col not in fieldnames:
            fieldnames.append(col)

    def save_checkpoint():
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    matched, skipped, failed = 0, 0, 0
    consecutive_errors = 0

    try:
        for i, row in enumerate(rows):
            if row.get("lat", "").strip() and row.get("lng", "").strip():
                row.setdefault("geocode_status", "already_had_coords")
                skipped += 1
                continue

            try:
                lat, lng, source, had_error = geocode_row(row)
            except Exception:
                print(f"[{i+1}/{len(rows)}] UNEXPECTED ERROR on {row.get('name')!r}:")
                traceback.print_exc()
                lat, lng, source, had_error = None, None, None, True

            if lat is not None:
                row["lat"] = f"{lat:.6f}"
                row["lng"] = f"{lng:.6f}"
                row["geocode_source"] = source
                row["geocode_status"] = "matched"
                matched += 1
                consecutive_errors = 0
                print(f"[{i+1}/{len(rows)}] matched ({source}): {row['name']}")
            else:
                row["geocode_status"] = "no_match"
                failed += 1
                consecutive_errors = consecutive_errors + 1 if had_error else 0
                print(f"[{i+1}/{len(rows)}] NO MATCH: {row['name']}  <- check manually")

            if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                print("=" * 70)
                print(f"STOPPING: {consecutive_errors} rows in a row failed with real")
                print("errors (not just 'no match'). That usually means the")
                print("User-Agent/contact info is still wrong, or you're offline,")
                print("or Nominatim has temporarily blocked this connection.")
                print("Fix that, then re-run with the SAME output file as input -")
                print("already-processed rows will be skipped automatically.")
                print("=" * 70)
                break

            if (i + 1) % 10 == 0:
                save_checkpoint()
                print(f"  (checkpoint saved at row {i+1})")

    except KeyboardInterrupt:
        print("\nInterrupted - saving progress so far...")

    save_checkpoint()
    print(f"\nDone. matched={matched} already_had_coords={skipped} no_match={failed}")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
