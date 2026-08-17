// Colour-coded categories, matching the "every category has its own pin
// colour" idea from the design brief - adapted to vambla's actual 16
// categories rather than the brief's example set.

export const CATEGORY_COLORS: Record<string, string> = {
  Castle: "#64748B",           // slate
  Ruin: "#94A3B8",             // lighter slate
  "Historic Pub": "#B91C1C",   // deep red (food & drink)
  "Stately Home": "#166534",   // dark green (estates)
  "Historic Building": "#78350F", // brown
  "Abbey/Priory": "#6D28D9",   // purple
  Church: "#8B5CF6",           // lighter purple
  Fort: "#1E3A5F",             // navy
  "Roman History": "#B45309",  // rust/terracotta
  Bridge: "#2563EB",           // blue (transport heritage)
  Lighthouse: "#0891B2",       // cyan
  Windmill: "#D97706",         // amber
  "Stone Circle": "#78716C",   // warm grey
  Beach: "#EAB308",            // sandy yellow
  Viewpoint: "#0D9488",        // teal

  // Added for the Brussels dataset - categories with no sensible match
  // in the original UK/Ireland set. A few close variants (Abbey,
  // Historic Bar, Cathedral, Basilica) were merged into existing
  // categories instead of adding near-duplicates here.
  Museum: "#4338CA",            // indigo
  Monument: "#44403C",          // dark stone
  Square: "#EA580C",            // orange (open plaza)
  Palace: "#CA8A04",            // dark gold
  "Historic Park": "#65A30D",   // lime green
  "Historic Site": "#A8A29E",   // neutral grey (catch-all)
  "Archaeological Site": "#92400E", // earthy brown (dig sites)
  "Historic Brewery": "#9A3412",    // warm brown-orange

  // Natural Beauty subcategories - a family of green/blue/earth tones so
  // they read as clearly related on the map
  "Natural Beauty": "#16A34A",
  "Nature Reserve": "#15803D",
  Waterfall: "#0284C7",
  River: "#0EA5E9",
  Lake: "#0369A1",
  Wetland: "#059669",
  Wetlands: "#059669",
  Island: "#0891B2",
  Mountain: "#57534E",
  Hill: "#84775A",
  Moor: "#A16207",
  Valley: "#4D7C0F",
  Woodland: "#166534",
  Forest: "#14532D",
  Cliffs: "#78716C",
  "Rock Formation": "#57534E",
};

export const DEFAULT_COLOR = "#57534E";

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

// Distance options for the radius selector, matching the brief exactly.
export const RADIUS_OPTIONS = [
  { label: "5 miles", miles: 5 },
  { label: "10 miles", miles: 10 },
  { label: "20 miles", miles: 20 },
  { label: "30 miles", miles: 30 },
  { label: "50 miles", miles: 50 },
  { label: "100 miles", miles: 100 },
  { label: "Anywhere", miles: null },
];
