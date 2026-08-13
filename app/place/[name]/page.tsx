import { getPlaceByName } from "@/lib/getPlacesInBounds";
import { TopNav, BottomNav } from "@/components/Nav";
import DirectionsButton from "@/components/DirectionsButton";
import SaveButton from "@/components/SaveButton";
import CategoryIcon from "@/components/CategoryIcon";
import { colorForCategory } from "@/lib/categoryStyle";
import Link from "next/link";

export default async function PlaceDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const place = await getPlaceByName(decodeURIComponent(name));

  if (!place) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--parchment)", paddingBottom: 70 }}>
        <TopNav />
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--moor-light)" }}>We couldn&apos;t find that place.</p>
          <Link href="/" style={{ color: "var(--moor)" }}>← Back to Discover</Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const color = colorForCategory(place.category);
  const hasValidCoords = Number.isFinite(place.lat) && Number.isFinite(place.lng);
  const goodForList = place.goodFor?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const collectionsList = [
    ...(place.experienceCollections?.split(",") ?? []),
    ...(place.heritageCollections?.split(",") ?? []),
  ].map((s) => s.trim()).filter(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)", paddingBottom: 70 }}>
      <TopNav />

      <div style={{ height: 260, background: place.imageUrl ? "#000" : `linear-gradient(135deg, ${color}dd, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ transform: "scale(3.5)" }}><CategoryIcon category={place.category} size={24} /></div>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "22px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 26, color: "var(--ink)", margin: 0 }}>{place.name}</h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--moor-light)", margin: "4px 0 0" }}>
              {place.category} · {place.county} · {place.country}{place.cost ? ` · ${place.cost}` : ""}
            </p>
          </div>
          <SaveButton placeName={place.name} size={26} />
        </div>

        {place.whyInteresting && (
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#3c4a3a", margin: "18px 0" }}>{place.whyInteresting}</p>
        )}

        {collectionsList.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {collectionsList.map((c) => (
              <span key={c} style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", background: "var(--parchment-dark)", padding: "4px 10px", borderRadius: 20, color: "var(--ink)" }}>{c}</span>
            ))}
          </div>
        )}

        {goodForList.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 0.5, color: "var(--moor-light)", marginBottom: 6 }}>Good for</p>
            <p style={{ fontSize: 13.5, color: "var(--ink)" }}>{goodForList.join(" · ")}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {hasValidCoords && <DirectionsButton lat={place.lat} lng={place.lng} />}
          {hasValidCoords && (
            <Link
              href={`/map?q=${encodeURIComponent(place.name)}`}
              style={{ display: "inline-flex", alignItems: "center", padding: "9px 14px", borderRadius: 7, border: "1.5px solid var(--moor)", color: "var(--moor)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
            >
              Show on map
            </Link>
          )}
          {place.officialWebsite && (
            <a href={place.officialWebsite} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "9px 14px", borderRadius: 7, border: "1.5px solid var(--ochre-dark)", color: "var(--ochre-dark)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Official website ↗
            </a>
          )}
        </div>

        {!hasValidCoords && (
          <p style={{ marginTop: 14, fontSize: 12, color: "var(--brick)" }}>
            This place doesn&apos;t have verified coordinates yet, so it can&apos;t be shown on the map or linked for directions.
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
