import { getRandomPlaces } from "@/lib/discover";
import DiscoverHome from "@/components/DiscoverHome";

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
