import type { Place } from "./types";

export type CollectionDef = {
  key: string;
  title: string;
  /** Returns true if a place belongs in this collection, based ONLY on
   * fields that already exist in the data model. */
  matches: (p: Place) => boolean;
};

// Every one of these checks an existing field (category / cost / good_for
// / experience_collections) - none of them invent a label the data
// doesn't already support. If a given tag isn't populated for a place in
// your dataset, it simply won't appear in that collection - that's
// correct behaviour, not a bug.
export const NEARBY_COLLECTIONS: CollectionDef[] = [
  {
    key: "hidden-gems",
    title: "Hidden gems nearby",
    matches: (p) => !!p.experienceCollections?.toLowerCase().includes("hidden gem"),
  },
  {
    key: "viewpoints",
    title: "Viewpoints nearby",
    matches: (p) => p.category === "Viewpoint",
  },
  {
    key: "family-friendly",
    title: "Family-friendly places nearby",
    matches: (p) => !!p.goodFor?.toLowerCase().includes("famil"),
  },
  {
    key: "historic-pubs",
    title: "Historic pubs nearby",
    matches: (p) => p.category === "Historic Pub",
  },
  {
    key: "castles",
    title: "Castles nearby",
    matches: (p) => p.category === "Castle",
  },
  {
    key: "ruins",
    title: "Ruins nearby",
    matches: (p) => p.category === "Ruin",
  },
  {
    key: "scenic",
    title: "Scenic places nearby",
    matches: (p) => !!p.experienceCollections?.toLowerCase().includes("great views"),
  },
  {
    key: "rainy-day",
    title: "Rainy-day places nearby",
    // only matches if your data actually has this tag populated - see
    // note in the project README about which enrichment pass added it
    matches: (p) => !!p.experienceCollections?.toLowerCase().includes("rainy day"),
  },
];
