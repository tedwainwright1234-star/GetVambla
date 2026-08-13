"""
fetch_wikipedia_images.py
---------------------------
Adds a real photo AND official website link for places that genuinely
have their own Wikipedia article - with TWO verification layers on top of
the earlier version, since a plain name match turned out to be unreliable
(e.g. a pub called "Princess Royal" was matching the royal title, not the
pub - a common problem since pubs are often named after monarchs,
generals, ships, and animals that ALSO have prominent Wikipedia articles).

VERIFICATION LAYERS:
  1. Person check (all categories): if Wikidata says the matched entity
     IS a human (or has a "sex or gender" property, which only humans/
     some animals have), the match is rejected entirely - no image, no
     website. This catches "Princess Royal", "Nelson", "Wellington",
     "Churchill", etc.
  2. Pub-specific topical check (Historic Pub category only): the matched
     Wikipedia page's own categories must actually mention "pub",
     "public house", or "inn" - otherwise rejected. This catches
     collisions with ships, places, and other non-person topics that a
     pub name might match (e.g. "Golden Hind", "Crown").

Only covers places with a Wikipedia source (non-blank "Wikipedia
Extract") - EXCEPT rows whose extract is just the CAMRA templated text
("CAMRA National Inventory..."), since those never had a real Wikipedia
article to begin with and a name-only lookup for them is exactly what
caused this bug. Those are skipped by default (see SKIP_CAMRA_TEXT
below) unless you want to gamble on some of them coincidentally also
having a real Wikipedia article - not recommended given what just
happened.

USAGE:
    python3 fetch_wikipedia_images.py places_final.csv places_with_images.csv
"""

import csv
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "vambla-tedwa-images/1.0 (personal project, non-commercial)"}

BAD_IMAGE_PATTERN = re.compile(
    r"coat.?of.?arms|flag.?of|logo|locator|_map\.|map_of|"
    r"blazon|crest|emblem|\.svg",
    re.IGNORECASE,
)
PUB_CATEGORY_PATTERN = re.compile(r"\bpubs?\b|public house|\binns?\b", re.IGNORECASE)

# For these categories specifically, the place name often collides with a
# town/village of the same name (e.g. "Filey" the beach vs "Filey" the
# town) - a plain name lookup can't tell them apart, so we verify the
# matched Wikipedia page's own categories actually mention the right kind
# of thing. If they don't, main() falls back to a proper search combining
# name + category instead of trusting the raw name match.
CATEGORY_TOPIC_PATTERNS = {
    "Historic Pub": PUB_CATEGORY_PATTERN,
    "Beach": re.compile(r"\bbeach(es)?\b", re.IGNORECASE),
    "Waterfall": re.compile(r"\bwaterfalls?\b", re.IGNORECASE),
    "Lake": re.compile(r"\blakes?\b|\blochs?\b|reservoirs?", re.IGNORECASE),
    "Island": re.compile(r"\bislands?\b|\bisles?\b", re.IGNORECASE),
    "River": re.compile(r"\brivers?\b", re.IGNORECASE),
    "Mountain": re.compile(r"\bmountains?\b|\bmunros?\b|\bpeaks?\b", re.IGNORECASE),
    "Hill": re.compile(r"\bhills?\b", re.IGNORECASE),
    "Cliffs": re.compile(r"\bcliffs?\b|coast", re.IGNORECASE),
    "Valley": re.compile(r"\bvalleys?\b|\bglens?\b|\bdales?\b", re.IGNORECASE),
    "Woodland": re.compile(r"\bwoods?\b|woodlands?|forests?", re.IGNORECASE),
    "Forest": re.compile(r"\bforests?\b|woodlands?", re.IGNORECASE),
    "Nature Reserve": re.compile(r"nature reserves?|wildlife", re.IGNORECASE),
    "Moor": re.compile(r"\bmoors?\b|moorland", re.IGNORECASE),
    "Viewpoint": re.compile(r"viewpoints?|hills?|mountains?|scenic", re.IGNORECASE),
    "Lighthouse": re.compile(r"lighthouses?", re.IGNORECASE),
    "Windmill": re.compile(r"windmills?", re.IGNORECASE),
    "Stone Circle": re.compile(r"stone circles?|megaliths?|prehistoric", re.IGNORECASE),
}

# Rows whose "extract" is just this templated CAMRA text never had a real
# Wikipedia article - skip them rather than risk a wrong name-collision match.
CAMRA_MARKER = "CAMRA National Inventory"


def api_get(url, params, retries=8):
    full_url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full_url, headers=HEADERS)
    wait = 5
    for attempt in range(retries):
        try:
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


def search_for_better_match(name, category, county):
    """Used when a direct name lookup resolved to the wrong kind of page
    (e.g. a beach's name matching its town's Wikipedia article instead).
    Searches Wikipedia combining the name with category/county for a more
    specific match, and returns the best result's title, or None."""
    query = f"{name} {category} {county}".strip()
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": "3",
        "format": "json",
    }
    try:
        result = api_get(WIKIPEDIA_API, params)
    except Exception:
        return None
    hits = result.get("query", {}).get("search", [])
    return hits[0]["title"] if hits else None


def fetch_page_info(titles):
    """Returns {title: {"image": url_or_None, "qid": QID_or_None,
    "categories": [list of category names]}}."""
    params = {
        "action": "query",
        "titles": "|".join(titles),
        "prop": "pageimages|pageprops|categories",
        "pithumbsize": "1024",
        "ppprop": "wikibase_item",
        "cllimit": "500",
        "clshow": "!hidden",
        "redirects": "1",
        "format": "json",
    }
    result = api_get(WIKIPEDIA_API, params)
    query = result.get("query", {})

    resolved_to_original = {t: t for t in titles}
    for entry in query.get("normalized", []):
        resolved_to_original[entry["to"]] = entry["from"]
    for entry in query.get("redirects", []):
        original = resolved_to_original.get(entry["from"], entry["from"])
        resolved_to_original[entry["to"]] = original

    out = {}
    for _, page in query.get("pages", {}).items():
        resolved_title = page.get("title", "")
        original = resolved_to_original.get(resolved_title, resolved_title)

        thumbnail = page.get("thumbnail", {})
        image_url = thumbnail.get("source")
        if image_url and BAD_IMAGE_PATTERN.search(image_url):
            image_url = None

        qid = page.get("pageprops", {}).get("wikibase_item")
        categories = [c["title"] for c in page.get("categories", [])]
        out[original] = {"image": image_url, "qid": qid, "categories": categories}
    return out


def fetch_person_check_and_websites(qids):
    """Returns {qid: {"is_person": bool, "website": url_or_None,
    "commons_category": name_or_None}}."""
    if not qids:
        return {}
    params = {
        "action": "wbgetentities",
        "ids": "|".join(qids),
        "props": "claims",
        "format": "json",
    }
    result = api_get(WIKIDATA_API, params)
    out = {}
    for qid, entity in result.get("entities", {}).items():
        claims = entity.get("claims", {})

        is_person = False
        instance_of_claims = claims.get("P31", [])
        for c in instance_of_claims:
            value = c.get("mainsnak", {}).get("datavalue", {}).get("value", {})
            if isinstance(value, dict) and value.get("id") == "Q5":  # Q5 = human
                is_person = True
        if claims.get("P21"):  # "sex or gender" - only ever set on people
            is_person = True

        website = None
        website_claims = claims.get("P856")
        if website_claims:
            website = website_claims[0].get("mainsnak", {}).get("datavalue", {}).get("value")

        commons_category = None
        commons_claims = claims.get("P373")  # "Commons category"
        if commons_claims:
            commons_category = commons_claims[0].get("mainsnak", {}).get("datavalue", {}).get("value")

        out[qid] = {"is_person": is_person, "website": website, "commons_category": commons_category}
    return out


def fetch_commons_category_image(category_name):
    """Given a Commons category name (e.g. "Tower of London"), returns the
    URL of the first real photo in that category, or None. This is the
    fallback used when Wikipedia's own single infobox image is missing or
    got rejected by the quality filter - Commons categories for notable
    places usually hold many more images than Wikipedia ever surfaces."""
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Category:{category_name}",
        "cmtype": "file",
        "cmlimit": "20",
        "format": "json",
    }
    try:
        result = api_get(COMMONS_API, params)
    except Exception:
        return None

    members = result.get("query", {}).get("categorymembers", [])
    candidate_titles = [
        m["title"] for m in members if not BAD_IMAGE_PATTERN.search(m["title"])
    ]
    if not candidate_titles:
        return None

    # Fetch the actual file URL for the first good candidate
    info_params = {
        "action": "query",
        "titles": candidate_titles[0],
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": "1024",
        "format": "json",
    }
    try:
        info_result = api_get(COMMONS_API, info_params)
    except Exception:
        return None

    pages = info_result.get("query", {}).get("pages", {})
    for _, page in pages.items():
        imageinfo = page.get("imageinfo", [])
        if imageinfo:
            # Prefer the resized thumbnail (matches size used elsewhere),
            # fall back to the original full-size file.
            return imageinfo[0].get("thumburl") or imageinfo[0].get("url")
    return None


def find_column(fieldnames, *candidates):
    lookup = {f.lower(): f for f in fieldnames}
    for candidate in candidates:
        if candidate.lower() in lookup:
            return lookup[candidate.lower()]
    return None


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 fetch_wikipedia_images.py <input.csv> <output.csv>")
        sys.exit(1)
    in_path, out_path = sys.argv[1], sys.argv[2]

    with open(in_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    name_col = find_column(fieldnames, "Name", "name")
    category_col = find_column(fieldnames, "Category", "category")
    county_col = find_column(fieldnames, "County", "county")
    extract_col = find_column(fieldnames, "Wikipedia Extract", "wikipedia_extract")
    if not name_col or not extract_col:
        print(f"Couldn't find required columns. Columns found: {fieldnames}")
        sys.exit(1)

    # Reuse existing image_url/official_website columns if this file already
    # has them (from an earlier run) rather than creating duplicates.
    image_col = find_column(fieldnames, "Image URL", "image_url") or "Image URL"
    website_col = find_column(fieldnames, "Official Website", "official_website") or "Official Website"
    for col in (image_col, website_col):
        if col not in fieldnames:
            fieldnames = fieldnames + [col]
        # Full re-verification run: clear existing values first, since
        # names/counties have been corrected and some previous images were
        # wrong - every row gets looked up fresh against the corrected data.
        for r in rows:
            r[col] = ""

    candidates = [
        r for r in rows
        if r.get(extract_col, "").strip()
        and CAMRA_MARKER not in r.get(extract_col, "")
    ]
    skipped_camra = sum(1 for r in rows if CAMRA_MARKER in r.get(extract_col, ""))
    print(f"{len(candidates)} of {len(rows)} rows will be looked up (full re-verification).")
    print(f"({skipped_camra} CAMRA-only pubs skipped - they never had a real Wikipedia article)")

    images_found, websites_found, rejected_person, rejected_wrong_topic, commons_fallback_used = 0, 0, 0, 0, 0

    for i in range(0, len(candidates), 50):
        batch = candidates[i:i + 50]
        names = [r[name_col] for r in batch]
        print(f"[{i+1}-{i+len(batch)}/{len(candidates)}] fetching + verifying...")
        try:
            page_info = fetch_page_info(names)
        except Exception as e:
            print(f"  [error] {e} - skipping this batch, rerun later to retry")
            continue

        qids = [info["qid"] for info in page_info.values() if info["qid"]]
        try:
            wikidata_info = fetch_person_check_and_websites(qids) if qids else {}
        except Exception as e:
            print(f"  [error fetching Wikidata checks] {e}")
            wikidata_info = {}

        for row in batch:
            info = page_info.get(row[name_col])
            name = row[name_col]
            category = row.get(category_col, "")
            county = row.get(county_col, "") if county_col else ""

            if not info:
                continue

            qid_check = wikidata_info.get(info["qid"], {}) if info["qid"] else {}
            if qid_check.get("is_person"):
                rejected_person += 1
                continue  # this matched a person, not the place - reject entirely

            topic_pattern = CATEGORY_TOPIC_PATTERNS.get(category)
            if topic_pattern:
                categories_text = " ".join(info["categories"])
                if not topic_pattern.search(categories_text):
                    # Direct name match resolved to the wrong kind of page
                    # (e.g. "Filey" matched the town, not the beach) - try
                    # a proper search combining name + category + county
                    # instead of trusting the raw name lookup.
                    better_title = search_for_better_match(name, category, county)
                    time.sleep(0.3)
                    if not better_title or better_title == name:
                        rejected_wrong_topic += 1  # search fallback found nothing better either
                        continue
                    retry_info = fetch_page_info([better_title])
                    time.sleep(0.3)
                    info = retry_info.get(better_title)
                    if not info:
                        rejected_wrong_topic += 1
                        continue
                    categories_text = " ".join(info["categories"])
                    if not topic_pattern.search(categories_text):
                        rejected_wrong_topic += 1  # still doesn't verify - give up rather than guess
                        continue
                    if info["qid"]:
                        retry_wikidata = fetch_person_check_and_websites([info["qid"]])
                        time.sleep(0.3)
                        qid_check = retry_wikidata.get(info["qid"], {})

            if info["image"]:
                row[image_col] = info["image"]
                images_found += 1
            elif qid_check.get("commons_category"):
                # Wikipedia's own infobox image was missing/rejected - try
                # that place's Commons category directly, which usually
                # has far more images than Wikipedia ever surfaces.
                commons_image = fetch_commons_category_image(qid_check["commons_category"])
                time.sleep(0.3)
                if commons_image:
                    row[image_col] = commons_image
                    images_found += 1
                    commons_fallback_used += 1
            if qid_check.get("website"):
                row[website_col] = qid_check["website"]
                websites_found += 1

        time.sleep(0.5)
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    print(f"\nFound images for {images_found} places, official websites for {websites_found} places.")
    print(f"(of which {commons_fallback_used} came from the Commons-category fallback,")
    print(f" i.e. Wikipedia's own infobox image was missing or didn't pass the quality filter)")
    print(f"Rejected {rejected_person} matches that were actually a person, not the place.")
    print(f"Rejected {rejected_wrong_topic} matches where the page turned out to be about the wrong kind of thing")
    print(f"(e.g. a town instead of its beach) - even after trying a name+category search fallback.")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
