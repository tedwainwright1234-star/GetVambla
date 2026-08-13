"""
enrich_places.py
-----------------
Fills in missing descriptive fields (Category, Why Interesting, Era,
Heritage Status, Visitor Access, etc.) for vambla's places CSV using the
Claude API, with STRUCTURED JSON output so it drops straight into your
existing columns.

USAGE:
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 enrich_places.py places_geocoded.csv places_enriched.csv

IMPORTANT - READ THIS BEFORE PUBLISHING ANYTHING IT GENERATES:
    Claude can hallucinate a plausible-sounding but WRONG fact, especially
    for obscure places (a lost village, a specific old pub, a folklore
    site). Every generated row is tagged "Needs Review" in a new column.
    Do not push these live to users without a human (or a second
    verification pass against Wikipedia / Historic England / Cadw /
    Historic Environment Scotland) checking the "Why Interesting" claim,
    since that's the one piece of content users will actually read and
    trust as fact.

WHAT IT FILLS IN (only if currently blank):
    Category, Category 2, Why Interesting, Grade, Visitor Access,
    Heritage Status, Era, Essential, Experience, Heritage

WHAT IT NEVER TOUCHES:
    Name, County, Country, Location, Latitude, Longitude, Source URL,
    Website Slug - these should come from you or the geocoder, not be
    invented by the model.
"""

import csv
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"

FIELDS_TO_FILL = [
    "Category", "Category 2", "Why Interesting", "Grade", "Visitor Access",
    "Heritage Status", "Era", "Essential", "Experience", "Heritage",
]

SYSTEM_PROMPT = """You are helping populate a database of historical and \
natural wonders in the UK and Ireland for a travel app called vambla. \
Given a place's name, county and country, return ONLY a JSON object (no \
markdown fences, no preamble) with these keys, filling in your best, most \
factually accurate answer for each. Use "" for a field if you are not \
reasonably confident:

- Category: short category e.g. "Castle", "Stone Circle", "Lost Village", \
"Historic Pub", "Waterfall"
- Category 2: broader grouping, can equal Category if none fits better
- Why Interesting: ONE punchy sentence (under 25 words) a curious visitor \
would want to read on a map pin - a specific, verifiable fact, not generic \
praise
- Grade: one of "Essential", "Interesting", "Hidden Gem"
- Visitor Access: one of "Open", "Ruins Only", "Restricted", "Seasonal", \
"Private - View Only"
- Heritage Status: official designation if any, e.g. "Grade I Listed", \
"Scheduled Monument", "UNESCO World Heritage Site", else ""
- Era: one of "Prehistoric", "Roman", "Medieval", "Tudor", "Georgian", \
"Victorian", "WWI", "WWII", "Modern", or ""
- Essential: one of "Essential", "Worth the Detour", "Hidden Gem"
- Experience: short phrase, e.g. "Dramatic coastal walk", "Atmospheric ruin"
- Heritage: one of "Prehistoric Britain", "Roman Britain", "Medieval \
Britain", "Tudor & Stuart", "Georgian Britain", "Victorian Britain", "WWI", \
"WWII", "Modern", or ""

Be conservative: it is better to leave a field "" than to invent a plausible \
-sounding but unverifiable fact. If a verified reference description is \
given, base "Why Interesting" on that fact, phrased in your own words - do \
not copy its wording, and do not add extra claims beyond what it supports."""


def call_claude(name, county, country, why_hint="", wikidata_note=""):
    user_content = f"Place: {name}\nCounty: {county}\nCountry: {country}"
    if why_hint:
        user_content += f"\nExisting note: {why_hint}"
    if wikidata_note:
        user_content += (
            f"\nVerified reference description (from Wikidata - use this as your "
            f"factual basis, but write your own original sentence, do not copy "
            f"its wording): {wikidata_note}"
        )

    body = json.dumps({
        "model": MODEL,
        "max_tokens": 500,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_content}],
    }).encode()

    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())

    text = "".join(b["text"] for b in data["content"] if b["type"] == "text")
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


def enrich_one(i, row):
    missing = [f for f in FIELDS_TO_FILL if not row.get(f, "").strip()]
    if not missing:
        return i, row, False
    try:
        result = call_claude(
            row["Name"], row.get("County", ""), row.get("Country", ""),
            why_hint=row.get("Why Interesting", ""),
            wikidata_note=row.get("Wikidata Description", ""),
        )
    except Exception as e:
        print(f"  [error] {row['Name']!r}: {e}")
        return i, row, False

    for f in missing:
        val = result.get(f, "")
        if val:
            row[f] = val
    row["Needs Review"] = "Yes"
    return i, row, True


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 enrich_places.py <input.csv> <output.csv> [--workers N]")
        sys.exit(1)
    if "ANTHROPIC_API_KEY" not in os.environ:
        print("Set ANTHROPIC_API_KEY first: export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]
    # For a few hundred rows, sequential (WORKERS=1) is fine. For 10,000+
    # rows, sequential would take hours - WORKERS=8 below runs several
    # requests in parallel. Don't go much higher than ~10 or you risk
    # hitting API rate limits (which will just show up as errors here).
    workers = int(os.environ.get("ENRICH_WORKERS", "8"))

    with open(in_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    if "Needs Review" not in fieldnames:
        fieldnames.append("Needs Review")

    def save_checkpoint():
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    filled = 0
    done = 0
    total_needing_work = sum(
        1 for r in rows if any(not r.get(f, "").strip() for f in FIELDS_TO_FILL)
    )
    print(f"{total_needing_work} rows need enriching, {workers} at a time...")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(enrich_one, i, row): i for i, row in enumerate(rows)}
        for future in as_completed(futures):
            i, updated_row, was_filled = future.result()
            rows[i] = updated_row
            if was_filled:
                filled += 1
                done += 1
                print(f"[{done}/{total_needing_work}] enriched: {updated_row['Name']}")
                if done % 200 == 0:  # checkpoint every 200 rows in case of a crash
                    save_checkpoint()
                    print(f"  (checkpoint saved at {done} rows)")

    save_checkpoint()
    print(f"\nDone. {filled} rows enriched (all flagged Needs Review). Written to {out_path}")


if __name__ == "__main__":
    main()
