import { getRandomPlaces } from "@/lib/discover";
import DiscoverHome from "@/components/DiscoverHome";

// Without this, Next.js can statically render the homepage once and
// serve that same cached HTML to everyone - which would freeze the
// "random" collections below to whatever they happened to be at build/
// first-request time, defeating the whole point of `order by random()`
// in the random_places() SQL function. force-dynamic guarantees this
// page (and therefore getRandomPlaces()) re-runs on every visit.
export const dynamic = "force-dynamic";

// The new homepage: Discover is the emotional centre of the app, not the
// map. Server component - pre-fetches a few collection previews so the
// page has real content on first load, before any client interactivity
// (Surprise Me, Explore Near Me) kicks in.
export default async function Home() {
  const [bucketList, hiddenGems, greatViews] = await Promise.all([
    getRandomPlaces({ collection: "Bucket List", count: 8, requireImage: true }),
    getRandomPlaces({ collection: "Hidden Gem", count: 8, requireImage: true }),
    getRandomPlaces({ collection: "Great Views", count: 8, requireImage: true }),
  ]);

  return <DiscoverHome bucketList={bucketList} hiddenGems={hiddenGems} greatViews={greatViews} />;
}
