import { createClient } from "@supabase/supabase-js";

// Only used once you switch lib/getPlaces.ts over to the Supabase query.
// Get these two values from your Supabase project settings -> API, and put
// them in .env.local (see .env.example).
//
// Before .env.local is set up, we fall back to a harmless placeholder URL
// rather than an empty string - createClient() throws immediately on an
// invalid URL, even though nothing in the app actually calls this client
// yet (see the hasSupabase check in getPlacesInBounds.ts).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
