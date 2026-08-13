import { Suspense } from "react";
import { getPlaces } from "@/lib/getPlaces";
import Explorer from "@/components/Explorer";

// The full-screen map exploration experience - now its own route rather
// than the homepage. Server component: fetches data and hands it to the
// client-side Explorer, which owns all the interactivity.
export default async function MapPage() {
  const initialPlaces = await getPlaces();
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading map…</div>}>
      <Explorer initialPlaces={initialPlaces} />
    </Suspense>
  );
}
