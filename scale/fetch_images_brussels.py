"""
fetch_images_brussels.py
-------------------------
Fills in missing image_url for a places CSV (matches your Brussels export
schema), using real photographs - never a generic stock photo, and
never invented.

RUN ORDER: run geocode_brussels.py FIRST if lat/lng are still blank.
This script uses coordinates to cross-check candidate matches (see
"COORDINATE CROSS-CHECK" below) AND as the search key for the Commons
geosearch tier - both are much weaker without coordinates already filled.

USAGE:
    python3 fetch_images_brussels.py places_geocoded.csv places_with_images.csv

LOOKUP ORDER (most reliable first):
  1. If the source URL is a Wikipedia article, pull that EXACT page's
     lead image via Wikipedia's REST summary API.
  2. Otherwise, search Wikipedia - across English, French AND Dutch
     (Belgium is officially bilingual, and Brussels-specific heritage
     buildings, individual guildhalls, and old pubs are frequently only
     documented on fr.wikipedia.org or nl.wikipedia.org, not English).
     Each language is tried with increasingly specific queries -
     "<name>, <category>, Brussels", then "<name>, Brussels", then the
     bare name - taking the first result whose title is a close match to
     the place name (titles_match).
  3. If nothing on any Wikipedia matched, search Wikimedia Commons
     directly for geotagged photos within 100m of the row's own
     coordinates (Commons has far broader photographic coverage than
     Wikipedia articles - heritage photography projects like Wiki Loves
     Monuments Belgium cover many buildings that never got a dedicated
     Wikipedia page). A nearby file is only accepted if its own filename
     is a plausible match for the place name - proximity alone is never
     enough, since central Brussels has many buildings within metres of
     each other.

COORDINATE CROSS-CHECK:
    A Wikipedia title-matched candidate (tier 2) is only accepted if
    Wikipedia's OWN coordinates for that article are within ~3km of the
    row's coordinates - catches two different buildings sharing a name,
    or a same-named place in a different city. Skipped if the row has no
    coordinates yet.

WHAT IT NEVER DOES:
    - Never falls back to a random/generic image.
    - Never overwrites an image_url that's already filled.
    - Never accepts a nearby-but-unmatched Commons file just because it's
      close by, and never accepts a title/coordinate mismatch silently -
      those rows are left blank and flagged in image_status (see STATUS
      VALUES) for a human to check by hand.

STATUS VALUES (image_status column):
    found              - image_url filled, see image_source for how
                          (wikipedia_direct / wikipedia_search_<lang> /
                          commons_geosearch)
    already_had_image  - skipped, image_url was already filled
    coord_mismatch     - a title-matched Wikipedia candidate existed, but
                          its real coordinates were too far from this
                          row's - left blank rather than risk a
                          wrong-building photo
    needs_review       - nothing confidently matched anywhere

RATE LIMIT: ~0.3s between requests - neither API needs Nominatim's strict
1/sec, but stay polite regardless, and set a real contact email in
HEADERS below before running this at any real volume.

Resume-safe: checkpoints every 25 rows, and skips any row that already
has an image_url on a re-run.
"""

import csv
import math
import re
import sys
import time
import urllib.request
import urllib.parse
import json
import difflib

HEADERS = {"User-Agent": "vambla-app-image-fetch/1.0 (contact: tedwainwright1234@gmail.com)"}
WIKI_URL_RE = re.compile(r"https?://([a-z]{2,3})\.wikipedia\.org/wiki/([^?#]+)")

# Belgium is officially French/Dutch/German - Brussels heritage content is
# frequently more complete on fr/nl Wikipedia than English. Tried in this
# order for every row that isn't found via a direct source URL.
SEARCH_LANGS = ["en", "fr", "nl"]

# How far (km) a candidate Wikipedia article's own coordinates are
# allowed to be from the row's coordinates before it's rejected as a
# likely wrong-place match.
MAX_COORD_DISTANCE_KM = 3.0

# How close (metres) a Commons file needs to be geotagged to the row's
# coordinates to even be considered - central Brussels is dense, so this
# stays tight; the filename match check below is the real safeguard.
COMMONS_GEOSEARCH_RADIUS_M = 100


def wikipedia_title_from_url(url: str):
    m = WIKI_URL_RE.match((url or "").strip())
    if not m:
        return None
    lang, title = m.group(1), urllib.parse.unquote(m.group(2)).replace("_", " ")
    return lang, title


def wikipedia_summary(lang: str, title: str):
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


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


def wikipedia_coordinates(lang: str, title: str):
    """The coordinates Wikipedia itself has for an article, or None."""
    params = {
        "action": "query",
        "prop": "coordinates",
        "titles": title,
        "format": "json",
        "formatversion": "2",
    }
    url = f"https://{lang}.wikipedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    pages = data.get("query", {}).get("pages", [])
    if not pages or "coordinates" not in pages[0]:
        return None
    coord = pages[0]["coordinates"][0]
    return float(coord["lat"]), float(coord["lon"])


def commons_geosearch(lat: float, lng: float, radius_m: int = COMMONS_GEOSEARCH_RADIUS_M, limit: int = 15):
    """Geotagged Commons files within radius_m of (lat, lng). Returns a
    list of File: titles - proximity only, no name matching yet."""
    params = {
        "action": "query",
        "list": "geosearch",
        "gscoord": f"{lat}|{lng}",
        "gsradius": radius_m,
        "gslimit": limit,
        "gsnamespace": 6,  # File namespace
        "format": "json",
    }
    url = f"https://commons.wikimedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    return [item["title"] for item in data.get("query", {}).get("geosearch", [])]


def commons_file_url(file_title: str):
    """The actual full-resolution upload.wikimedia.org URL for a Commons
    File: title, via imageinfo (not the description-page URL)."""
    params = {
        "action": "query",
        "titles": file_title,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }
    url = f"https://commons.wikimedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo")
        if info:
            return info[0].get("url")
    return None


def _clean_filename(file_title: str) -> str:
    """'File:Bruxelles - Grand Place 02.jpg' -> 'Bruxelles Grand Place'.
    Strips the File: prefix, extension, and trailing digits/dates that
    are just photo-numbering, not part of the subject's name."""
    name = re.sub(r"^File:", "", file_title, flags=re.IGNORECASE)
    name = re.sub(r"\.(jpe?g|png|webp|tiff?)$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"[\d]{2,}[\-_\s]*$", "", name)  # trailing numbers/dates
    return name


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _normalize_title(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().replace("-", " ").replace("_", " ")).strip()


def titles_match(name: str, title: str) -> bool:
    """Conservative similarity check - guards against wrong-place matches.
    Rejecting a borderline match (leaving it for manual review) is always
    preferable to silently attaching the wrong photo to a place. Compares
    both the full title and the title with a trailing ", City" style
    disambiguator stripped."""
    a = _normalize_title(name)
    candidates = {_normalize_title(title), _normalize_title(title.split(",")[0])}
    for b in candidates:
        if a == b or a in b or b in a:
            return True
        if difflib.SequenceMatcher(None, a, b).ratio() >= 0.82:
            return True
    return False


def filename_plausibly_matches(name: str, file_title: str) -> bool:
    """Looser than titles_match (photo filenames are messier than article
    titles - "Bruxelles - Grand Place 02.jpg" isn't a close string match
    to "Grand-Place" by ratio alone) - but still requires at least one
    meaningful word of the place name to appear in the filename. This is
    deliberately the weakest check in the whole script, which is exactly
    why it's paired with a tight geosearch radius rather than used alone."""
    name_words = [w for w in re.findall(r"[a-zA-Z]+", name.lower()) if len(w) >= 4]
    if not name_words:
        return titles_match(name, _clean_filename(file_title))
    cleaned = _normalize_title(_clean_filename(file_title))
    return any(w in cleaned for w in name_words) or titles_match(name, _clean_filename(file_title))


def best_image(summary: dict):
    if summary.get("originalimage", {}).get("source"):
        return summary["originalimage"]["source"]
    if summary.get("thumbnail", {}).get("source"):
        return summary["thumbnail"]["source"]
    return None


def get_source_url(row):
    """The dataset's export has used both 'Source URL' and 'source_url' as
    the column name across different versions - check both rather than
    silently reading nothing if the header changes again."""
    return (row.get("source_url") or row.get("Source URL") or "").strip()


def row_coords(row):
    try:
        lat, lng = float(row.get("lat", "")), float(row.get("lng", ""))
        return lat, lng
    except (TypeError, ValueError):
        return None


def find_via_wikipedia_search(name: str, category: str, this_coords):
    """Tries each language in SEARCH_LANGS in turn. Returns
    (image_url, source, status)."""
    status = "needs_review"
    for lang in SEARCH_LANGS:
        search_queries = []
        if category:
            search_queries.append(f"{name}, {category}, Brussels")
        search_queries.append(f"{name}, Brussels")
        search_queries.append(name)

        candidates = []
        for q in search_queries:
            try:
                candidates = wikipedia_search(lang, q)
            except Exception as e:
                print(f"  [{lang} search error] {name!r}: {e}")
                candidates = []
            time.sleep(0.3)
            if candidates:
                break

        for candidate_title in candidates:
            if not titles_match(name, candidate_title):
                continue

            if this_coords:
                try:
                    candidate_coords = wikipedia_coordinates(lang, candidate_title)
                except Exception as e:
                    print(f"  [{lang} coord check error] {name!r}: {e}")
                    candidate_coords = None
                time.sleep(0.3)
                if candidate_coords:
                    dist = haversine_km(*this_coords, *candidate_coords)
                    if dist > MAX_COORD_DISTANCE_KM:
                        print(f"  [coord mismatch] {name!r} vs {lang}:{candidate_title!r}: {dist:.1f}km apart - rejected")
                        status = "coord_mismatch"
                        continue

            try:
                summary = wikipedia_summary(lang, candidate_title)
                candidate_image = best_image(summary)
            except Exception as e:
                print(f"  [{lang} summary error] {name!r}: {e}")
                candidate_image = None
            time.sleep(0.3)
            if candidate_image:
                return candidate_image, f"wikipedia_search_{lang}", "found"

    return None, None, status


def find_via_commons_geosearch(name: str, this_coords):
    """Last resort: geotagged Commons files near the row's own
    coordinates, filtered by a plausible filename match. Returns
    (image_url, source, status)."""
    if not this_coords:
        return None, None, "needs_review"
    try:
        nearby = commons_geosearch(*this_coords)
    except Exception as e:
        print(f"  [commons geosearch error] {name!r}: {e}")
        return None, None, "needs_review"
    time.sleep(0.3)

    for file_title in nearby:
        if not filename_plausibly_matches(name, file_title):
            continue
        try:
            url = commons_file_url(file_title)
        except Exception as e:
            print(f"  [commons imageinfo error] {name!r}: {e}")
            url = None
        time.sleep(0.3)
        if url:
            return url, "commons_geosearch", "found"

    return None, None, "needs_review"


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 fetch_images_brussels.py <input.csv> <output.csv>")
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]

    with open(in_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    for col in ("image_source", "image_status"):
        if col not in fieldnames:
            fieldnames.append(col)

    def save_checkpoint():
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    found, skipped, failed, coord_rejected = 0, 0, 0, 0

    for i, row in enumerate(rows):
        if row.get("image_url", "").strip():
            row.setdefault("image_status", "already_had_image")
            skipped += 1
            continue

        name = row["name"].strip()
        category = row.get("category", "").strip()
        this_coords = row_coords(row)
        image_url, source, status = None, None, "needs_review"

        wiki = wikipedia_title_from_url(get_source_url(row))
        if wiki:
            lang, title = wiki
            try:
                summary = wikipedia_summary(lang, title)
                image_url = best_image(summary)
                if image_url:
                    source = "wikipedia_direct"
            except Exception as e:
                print(f"  [wikipedia error] {name!r}: {e}")
            time.sleep(0.3)

        if not image_url:
            image_url, source, status = find_via_wikipedia_search(name, category, this_coords)

        if not image_url and status != "coord_mismatch":
            image_url, source, status = find_via_commons_geosearch(name, this_coords)

        if image_url:
            row["image_url"] = image_url
            row["image_source"] = source
            row["image_status"] = "found"
            found += 1
            print(f"[{i+1}/{len(rows)}] found ({source}): {name}")
        else:
            row["image_status"] = status
            failed += 1
            if status == "coord_mismatch":
                coord_rejected += 1
            print(f"[{i+1}/{len(rows)}] NO IMAGE ({status}): {name}  <- check manually")

        if (i + 1) % 25 == 0:
            save_checkpoint()
            print(f"  (checkpoint saved at row {i+1})")

    save_checkpoint()
    print(f"\nDone. found={found} already_had_image={skipped} needs_review={failed} (of which coord_mismatch={coord_rejected})")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
