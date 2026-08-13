"""
fetch_from_wikidata.py
------------------------
Pulls REAL places (with real coordinates) from Wikidata for the UK and
Ireland, category by category, using Wikidata's free SPARQL endpoint.
This replaces the "ask Claude to invent new places" approach for scaling
past a few hundred entries - every row here is a verified Wikidata entity,
not a model guess, and coordinates come for free (no geocoding step
needed).

USAGE:
    python3 fetch_from_wikidata.py places_wikidata.csv

WHAT IT PULLS (edit CATEGORY_QUERIES to add/remove categories):
    Castles, stone circles, hillforts, waterfalls, abbeys/priories,
    historic houses/stately homes, lighthouses, standing stones,
    lost villages / deserted settlements.
    Each category is a separate SPARQL query against Wikidata's public
    endpoint (https://query.wikidata.org/sparql) restricted to items
    located in the UK or Ireland with coordinate data.

OUTPUT COLUMNS (matches your existing CSV schema, extra ones for grounding):
    Name, Category, County, Country, Latitude, Longitude,
    Wikidata Description   <- short factual description straight from Wikidata,
                              used later as grounding context for Claude so it
                              paraphrases a real fact instead of inventing one
    Wikipedia URL           <- for a human reviewer to double check

NOTE ON SCALE: a single query can return thousands of rows. Wikidata's
public endpoint has a query timeout (usually 60s) and light rate limiting,
so this script runs one category at a time with a pause between them. If a
category query times out, narrow it (e.g. split "castles" into
England/Scotland/Wales/Ireland separately) rather than requesting more per
call.
"""

import csv
import json
import sys
import time
import urllib.request
import urllib.parse

SPARQL_URL = "https://query.wikidata.org/sparql"
HEADERS = {
    "Accept": "application/sparql-results+json",
    # Wikidata asks for a descriptive User-Agent identifying your app/contact
    "User-Agent": "vambla-app-data-fetch/1.0 (contact: you@example.com)",
}

# Q-numbers: Q23413 castle, Q179700 statue(not used), Q839954 archaeological site,
# Q1343246 stone circle, Q1785071 hillfort, Q34038 waterfall, Q160742 abbey,
# Q16560 palace, Q751876 chateau(not used), Q39715 lighthouse, Q179700(not used)
# Q16970 church(not used - too many), Q5003624 stately home
# GB=Q145, Ireland=Q27, N. Ireland handled as part of GB (Q26 for Northern Ireland region)
CATEGORY_QUERIES = {
    "Castle": "wd:Q23413",
    "Stone Circle": "wd:Q1343246",
    "Hillfort": "wd:Q1785071",
    "Waterfall": "wd:Q34038",
    "Abbey/Priory": "wd:Q160742",
    "Historic House": "wd:Q5003624",
    "Lighthouse": "wd:Q39715",
    "Archaeological Site": "wd:Q839954",
}

COUNTRIES = {
    "United Kingdom": "wd:Q145",
    "Ireland": "wd:Q27",
}


def build_query(instance_of_qid: str, country_qid: str) -> str:
    return f"""
SELECT ?itemLabel ?countyLabel ?countryLabel ?coord ?itemDescription ?article WHERE {{
  ?item wdt:P31 {instance_of_qid} .
  ?item wdt:P17 {country_qid} .
  ?item wdt:P625 ?coord .
  OPTIONAL {{ ?item wdt:P131 ?county . }}
  OPTIONAL {{
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }}
  BIND({country_qid} AS ?countryItem)
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT 2000
"""


def run_query(query: str):
    url = f"{SPARQL_URL}?{urllib.parse.urlencode({'query': query, 'format': 'json'})}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode())


def parse_point(coord_str: str):
    # Wikidata returns "Point(-2.1601 50.6239)" i.e. lng then lat
    inner = coord_str.strip().removeprefix("Point(").removesuffix(")")
    lng_str, lat_str = inner.split(" ")
    return float(lat_str), float(lng_str)


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fetch_from_wikidata.py <output.csv>")
        sys.exit(1)
    out_path = sys.argv[1]

    fieldnames = [
        "Name", "Category", "County", "Country", "Latitude", "Longitude",
        "Wikidata Description", "Wikipedia URL",
    ]
    seen = set()
    all_rows = []

    for category, qid in CATEGORY_QUERIES.items():
        for country_name, country_qid in COUNTRIES.items():
            print(f"Querying {category} in {country_name}...")
            try:
                result = run_query(build_query(qid, country_qid))
            except Exception as e:
                print(f"  [error] {e} - skipping")
                continue

            bindings = result.get("results", {}).get("bindings", [])
            print(f"  got {len(bindings)} results")

            for b in bindings:
                name = b.get("itemLabel", {}).get("value", "").strip()
                coord = b.get("coord", {}).get("value", "")
                if not name or not coord:
                    continue
                key = (name.lower(), country_name)
                if key in seen:
                    continue
                seen.add(key)
                try:
                    lat, lng = parse_point(coord)
                except Exception:
                    continue

                all_rows.append({
                    "Name": name,
                    "Category": category,
                    "County": b.get("countyLabel", {}).get("value", ""),
                    "Country": country_name,
                    "Latitude": f"{lat:.6f}",
                    "Longitude": f"{lng:.6f}",
                    "Wikidata Description": b.get("itemDescription", {}).get("value", ""),
                    "Wikipedia URL": b.get("article", {}).get("value", ""),
                })

            time.sleep(2)  # be polite to the shared public endpoint

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\nTotal unique places: {len(all_rows)}")
    print(f"Written to {out_path}")
    print("\nNext: run enrich_places.py on this file to write 'Why Interesting'")
    print("sentences grounded in the Wikidata Description column.")


if __name__ == "__main__":
    main()
