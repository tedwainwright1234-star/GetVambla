// Parses free-text search queries into structured filters, e.g.
// "castles in north yorkshire" -> { category: "Castle", location: "North Yorkshire" }
// "historic pubs near york" -> { category: "Historic Pub", location: "York" }
// "bath" -> { category: null, location: "Bath" }
//
// This is intentionally rule-based (not ML/AI) - fast, predictable, and
// transparent about what it matched, which matters more here than
// handling every possible phrasing.

export type ParsedSearch = {
  category: string | null;
  categoryLabel: string | null; // the actual matched category, for display
  location: string | null;
  radiusMiles: number | null;
  raw: string;
};

// Maps lots of real-world phrasings to your actual category values.
// Order matters where phrases overlap (checked longest-first internally).
const CATEGORY_SYNONYMS: Record<string, string> = {
  castle: "Castle", castles: "Castle",
  ruin: "Ruin", ruins: "Ruin",
  "historic pub": "Historic Pub", "historic pubs": "Historic Pub",
  pub: "Historic Pub", pubs: "Historic Pub", inn: "Historic Pub", inns: "Historic Pub",
  "stately home": "Stately Home", "stately homes": "Stately Home",
  "country house": "Stately Home", "country houses": "Stately Home",
  manor: "Stately Home", mansion: "Stately Home",
  "historic building": "Historic Building", "historic buildings": "Historic Building",
  abbey: "Abbey/Priory", abbeys: "Abbey/Priory",
  priory: "Abbey/Priory", priories: "Abbey/Priory",
  monastery: "Abbey/Priory", monasteries: "Abbey/Priory",
  church: "Church", churches: "Church", cathedral: "Church", cathedrals: "Church",
  fort: "Fort", forts: "Fort", hillfort: "Fort", hillforts: "Fort",
  roman: "Roman History", "roman history": "Roman History", "roman site": "Roman History", "roman sites": "Roman History",
  bridge: "Bridge", bridges: "Bridge",
  lighthouse: "Lighthouse", lighthouses: "Lighthouse",
  windmill: "Windmill", windmills: "Windmill",
  "stone circle": "Stone Circle", "stone circles": "Stone Circle",
  beach: "Beach", beaches: "Beach",
  viewpoint: "Viewpoint", viewpoints: "Viewpoint", "view point": "Viewpoint", "view points": "Viewpoint",
  waterfall: "Waterfall", waterfalls: "Waterfall",
  lake: "Lake", lakes: "Lake", loch: "Lake", lochs: "Lake",
  mountain: "Mountain", mountains: "Mountain",
  hill: "Hill", hills: "Hill",
  forest: "Forest", forests: "Forest", woodland: "Woodland", woodlands: "Woodland",
  island: "Island", islands: "Island",
  "nature reserve": "Nature Reserve", "nature reserves": "Nature Reserve",
  cliff: "Cliffs", cliffs: "Cliffs",
  moor: "Moor", moors: "Moor", moorland: "Moor",
  valley: "Valley", valleys: "Valley",
  river: "River", rivers: "River",
  wetland: "Wetland", wetlands: "Wetland",
};

const LOCATION_TRIGGER_WORDS = ["in", "near", "around", "close to", "within"];

const RADIUS_PATTERN = /\b(\d{1,3})\s*(?:mile|miles|mi)\b/i;

export function parseSearch(query: string): ParsedSearch {
  const raw = query.trim();
  const lower = raw.toLowerCase();

  // 1. Radius, if explicitly mentioned (e.g. "castles within 20 miles of bath")
  let radiusMiles: number | null = null;
  const radiusMatch = lower.match(RADIUS_PATTERN);
  if (radiusMatch) radiusMiles = parseInt(radiusMatch[1], 10);

  let remaining = lower.replace(RADIUS_PATTERN, "").trim();

  // 2. Category - try longest phrases first so "historic pubs" matches
  //    before the shorter "pubs" would.
  let category: string | null = null;
  const sortedSynonyms = Object.keys(CATEGORY_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const phrase of sortedSynonyms) {
    const pattern = new RegExp(`\\b${phrase}\\b`, "i");
    if (pattern.test(remaining)) {
      category = CATEGORY_SYNONYMS[phrase];
      remaining = remaining.replace(pattern, "").trim();
      break;
    }
  }

  // 3. Location - whatever's left, after stripping a leading trigger word
  //    ("in", "near", "around"...). If nothing matched as a category, the
  //    whole remaining query is treated as a location (e.g. just "Bath").
  let location: string | null = null;
  for (const trigger of LOCATION_TRIGGER_WORDS) {
    const pattern = new RegExp(`^${trigger}\\s+`, "i");
    if (pattern.test(remaining)) {
      remaining = remaining.replace(pattern, "").trim();
      break;
    }
  }
  // A trigger word with nothing meaningful after it (e.g. "castles within
  // 20 miles" leaves just "within" once the radius is stripped) isn't a
  // location - only keep it if there's substance left.
  const isJustTriggerWord = LOCATION_TRIGGER_WORDS.some((t) => t === remaining);
  if (remaining && !isJustTriggerWord) location = remaining;

  return {
    category,
    categoryLabel: category,
    location: location ? titleCase(location) : null,
    radiusMiles,
    raw,
  };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
