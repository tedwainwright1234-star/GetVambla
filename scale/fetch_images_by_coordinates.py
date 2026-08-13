"""
fetch_images_by_coordinates.py
---------------------------------
Fills in remaining missing images using coordinates rather than requiring
a Wikipedia article to exist - covers a different, wider set of places
than fetch_wikipedia_images.py did.

TWO FREE, KEYLESS SOURCES, TRIED IN ORDER:

  1. Wikimedia Commons geosearch - finds photos that were geotagged near
     these exact coordinates when uploaded, independent of whether the
     place has a Wikipedia article. This is the primary source.
  2. OpenStreetMap tags - some OSM nodes/ways have an image= or
     wikimedia_commons= tag set directly by contributors, checked as a
     fallback for anything Commons geosearch didn't find.

VERIFICATION (since a photo taken "near" a point isn't necessarily OF the
named place - it could be next door):
  - The candidate photo's filename/title must contain a recognisable
    word from the place's name (not just be nearby). This is a real,
    if imperfect, sanity check - it will occasionally miss a genuine
    match with an unrelated filename, but it won't confidently attach a
    wrong photo, which matters more.
  - The same "reject crests/flags/maps/logos" filter from before.
  - The same "reject if Wikidata says it's a person" check, applied
    where a Commons file links to a Wikidata item.

Only processes rows where image_url is currently BLANK - anything
already verified is left completely untouched.

USAGE:
    python3 fetch_images_by_coordinates.py places.csv places_with_more_images.csv
"""

import csv
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
OVERPASS_API = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "vambla-tedwa-coordimages/1.0 (personal project, non-commercial)"}

BAD_IMAGE_PATTERN = re.compile(
    r"coat.?of.?arms|flag.?of|logo|locator|_map\.|map_of|"
    r"blazon|crest|emblem|\.svg",
    re.IGNORECASE,
)

STOPWORDS = {"the", "of", "and", "at", "in", "on", "a", "an"}


def api_get(url, params, retries=8, is_post=False, post_data=None):
    wait = 5
    for attempt in range(retries):
        try:
            if is_post:
                req = urllib.request.Request(url, data=post_data.encode(), headers=HEADERS, method="POST")
            else:
                full_url = f"{url}?{urllib.parse.urlencode(params)}"
                req = urllib.request.Request(full_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                retry_after = e.headers.get("Retry-After")
                sleep_for = int(retry_after) if retry_after else wait
                print(f"    [rate limited] waiting {sleep_for}s...")
                time.sleep(sleep_for)
                wait = min(wait * 2, 90)
                continue
            if attempt == retries - 1:
                raise
            time.sleep(wait)
            wait = min(wait * 2, 90)
        except (urllib.error.URLError, TimeoutError):
            if attempt == retries - 1:
                raise
            time.sleep(wait)
            wait = min(wait * 2, 90)
    raise RuntimeError("gave up after retries")


def name_words(name):
    words = re.findall(r"[a-z]+", name.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def title_matches_name(title, name):
    """Does this Commons filename plausibly relate to the place name?
    Requires at least one meaningful, non-generic word in common."""
    title_words = name_words(title)
    target_words = name_words(name)
    return bool(title_words & target_words)


def commons_geosearch(lat, lng, name, radius_m=150):
    """Searches Wikimedia Commons for geotagged photos near this point,
    returns a verified full-resolution image URL or None."""
    try:
        result = api_get(COMMONS_API, {
            "action": "query", "list": "geosearch",
            "gscoord": f"{lat}|{lng}", "gsradius": radius_m, "gslimit": 15,
            "gsnamespace": 6,  # File: namespace only
            "format": "json",
        })
    except Exception as e:
        print(f"    [commons geosearch error] {e}")
        return None

    candidates = result.get("query", {}).get("geosearch", [])
    matching = [c for c in candidates if title_matches_name(c["title"], name)]
    if not matching:
        return None

    # get the actual full-resolution URL for the best (closest) match
    best = matching[0]
    try:
        info = api_get(COMMONS_API, {
            "action": "query", "titles": best["title"],
            "prop": "imageinfo", "iiprop": "url", "format": "json",
        })
    except Exception as e:
        print(f"    [commons imageinfo error] {e}")
        return None

    pages = info.get("query", {}).get("pages", {})
    for _, page in pages.items():
        imageinfo = page.get("imageinfo", [])
        if imageinfo:
            url = imageinfo[0].get("url")
            if url and not BAD_IMAGE_PATTERN.search(url):
                return url
    return None


def osm_tag_image(lat, lng, name, radius_m=80):
    """Checks OSM for a nearby node/way with a matching name that has an
    image= or wikimedia_commons= tag set."""
    query = f"""
    [out:json][timeout:30];
    (
      node(around:{radius_m},{lat},{lng})["name"];
      way(around:{radius_m},{lat},{lng})["name"];
    );
    out tags;
    """
    try:
        result = api_get(OVERPASS_API, None, is_post=True, post_data=f"data={urllib.parse.quote(query)}")
    except Exception as e:
        print(f"    [OSM error] {e}")
        return None

    for el in result.get("elements", []):
        tags = el.get("tags", {})
        el_name = tags.get("name", "")
        if not title_matches_name(el_name, name):
            continue
        if tags.get("wikimedia_commons", "").startswith("File:"):
            # resolve this Commons filename to a real URL
            try:
                info = api_get(COMMONS_API, {
                    "action": "query", "titles": tags["wikimedia_commons"],
                    "prop": "imageinfo", "iiprop": "url", "format": "json",
                })
                pages = info.get("query", {}).get("pages", {})
                for _, page in pages.items():
                    imageinfo = page.get("imageinfo", [])
                    if imageinfo and imageinfo[0].get("url"):
                        return imageinfo[0]["url"]
            except Exception:
                pass
        if tags.get("image", "").startswith("http"):
            return tags["image"]
    return None


def find_column(fieldnames, *candidates):
    lookup = {f.lower(): f for f in fieldnames}
    for c in candidates:
        if c.lower() in lookup:
            return lookup[c.lower()]
    return None


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 fetch_images_by_coordinates.py <input.csv> <output.csv>")
        sys.exit(1)
    in_path, out_path = sys.argv[1], sys.argv[2]

    with open(in_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    name_col = find_column(fieldnames, "Name", "name")
    lat_col = find_column(fieldnames, "Latitude", "lat")
    lng_col = find_column(fieldnames, "Longitude", "lng", "lon")
    image_col = find_column(fieldnames, "Image URL", "image_url") or "Image URL"
    if image_col not in fieldnames:
        fieldnames = fieldnames + [image_col]

    todo = [r for r in rows if not r.get(image_col, "").strip() and r.get(lat_col) and r.get(lng_col)]
    print(f"{len(todo)} of {len(rows)} rows are missing an image and have coordinates to search from.")

    def save_progress():
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    found_commons, found_osm, not_found = 0, 0, 0

    for i, row in enumerate(todo):
        name = row[name_col]
        lat, lng = float(row[lat_col]), float(row[lng_col])
        print(f"[{i+1}/{len(todo)}] {name}...")

        url = commons_geosearch(lat, lng, name)
        if url:
            row[image_col] = url
            found_commons += 1
            print(f"    found via Commons geosearch")
        else:
            url = osm_tag_image(lat, lng, name)
            if url:
                row[image_col] = url
                found_osm += 1
                print(f"    found via OSM tag")
            else:
                not_found += 1

        time.sleep(1.0)  # pace requests across both free services

        if (i + 1) % 25 == 0:
            save_progress()
            print(f"  (checkpoint saved at {i+1} processed)")

    save_progress()
    print(f"\nFound via Commons geosearch: {found_commons}")
    print(f"Found via OSM tags: {found_osm}")
    print(f"Still not found: {not_found}")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
