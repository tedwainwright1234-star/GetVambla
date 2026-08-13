export type Place = {
  name: string;
  category: string;
  county: string;
  country: string;
  whyInteresting: string;
  cost?: string;                    // 'Free' | '£' | '££' | '£££'
  goodFor?: string;                 // comma-separated
  experienceCollections?: string;   // comma-separated, e.g. 'Hidden Gem, Great Views'
  heritageCollections?: string;     // comma-separated, e.g. 'National Trust, UNESCO'
  imageUrl?: string;                // Wikipedia lead image, if one was found
  officialWebsite?: string;         // from Wikidata's structured data, when available
  lat: number;
  lng: number;
};
