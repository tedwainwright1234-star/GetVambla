"""
geocode_places.py
------------------
Fills in missing Latitude/Longitude for vambla's places CSV using the free
OpenStreetMap Nominatim geocoding API (no API key needed).

USAGE:
    python3 geocode_places.py places_clean.csv places_geocoded.csv

WHAT IT DOES:
    - Skips any row that already has Latitude + Longitude.
    - For every other row, builds a search string from Name + County + Country
      (falls back to just Name + Country if the first query finds nothing).
    - Queries Nominatim, waits 1.1s between requests (their usage policy
      requires max 1 request/second and a real User-Agent).
    - Writes the result back, plus two new columns:
        Geocode Confidence  -> Nominatim's own match "importance" score
        Geocode Status      -> "matched", "no_match", or "error"
    - Anything marked no_match / error needs a human to check manually
      (search engines/OS Maps are more reliable for obscure ruins, lost
      villages, individual trees, etc. than a geocoder).

NOTES:
    - This uses the public Nominatim instance, which is rate-limited and
      meant for light use. For 150+ one-off lookups it's fine. If you end up
      re-running this regularly (e.g. adding 50 places a week), consider
      self-hosting Nominatim or using a paid geocoder (Google Geocoding API,
      LocationIQ, Mapbox) instead, and swap out the `geocode_one()` function.
    - Always sanity check a sample of results on a map before publishing.
      Geocoders occasionally return the centre of a whole county or a
      like-named place in a different country.
"""

import csv
import sys
import time
import urllib.request
import urllib.parse
import json

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim REQUIRES a descriptive User-Agent identifying your app/contact.
# Replace the email below with a real contact address before running this
# at any real volume - they will block generic/missing User-Agents.
HEADERS = {"User-Agent": "vambla-app-geocoder/1.0 (contact: you@example.com)"}


def geocode_one(query: str):
    """Return (lat, lon, importance) for the best match, or None if no match."""
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "countrycodes": "gb,ie",  # restrict to UK + Ireland
    }
    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    if not data:
        return None
    best = data[0]
    return float(best["lat"]), float(best["lon"]), best.get("importance", "")


def build_queries(row):
    name = row["Name"].strip()
    county = row.get("County", "").strip()
    country = row.get("Country", "").strip()
    candidates = []
    if name and county and country:
        candidates.append(f"{name}, {county}, {country}")
    if name and country:
        candidates.append(f"{name}, {country}")
    if name:
        candidates.append(name)
    return candidates


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 geocode_places.py <input.csv> <output.csv>")
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]

    with open(in_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    for col in ("Geocode Confidence", "Geocode Status"):
        if col not in fieldnames:
            fieldnames.append(col)

    matched, skipped, failed = 0, 0, 0

    for i, row in enumerate(rows):
        if row.get("Latitude", "").strip() and row.get("Longitude", "").strip():
            row.setdefault("Geocode Status", "already_had_coords")
            skipped += 1
            continue

        result = None
        for query in build_queries(row):
            try:
                result = geocode_one(query)
            except Exception as e:
                print(f"  [error] {row['Name']!r}: {e}")
                result = None
            time.sleep(1.1)  # respect Nominatim's 1 req/sec limit
            if result:
                break

        if result:
            lat, lon, importance = result
            row["Latitude"] = f"{lat:.6f}"
            row["Longitude"] = f"{lon:.6f}"
            row["Geocode Confidence"] = importance
            row["Geocode Status"] = "matched"
            matched += 1
            print(f"[{i+1}/{len(rows)}] matched: {row['Name']}")
        else:
            row["Geocode Status"] = "no_match"
            failed += 1
            print(f"[{i+1}/{len(rows)}] NO MATCH: {row['Name']}  <- check manually")

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone. matched={matched} already_had_coords={skipped} no_match={failed}")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
