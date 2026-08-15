"use client";

import RadiusSelector from "./RadiusSelector";

type Props = {
  categories: string[]; // empty = no category filter
  locationLabel: string | null;
  radiusMiles: number | null;
  focusedPlaceName?: string | null;
  onRemoveCategory: (cat: string) => void;
  onClearLocation: () => void;
  onChangeRadius: (miles: number | null) => void;
  onClearFocusedPlace?: () => void;
};

// A compact, removable summary of the current search - e.g.
// "📍 Bamburgh Castle ✕", "Castle ✕", "North Yorkshire ✕" - plus, right
// underneath, an always-visible radius slider whenever a location is
// active. No need to click anything to find it - it's just there,
// directly under the search bar, ready to drag. Renders nothing when
// nothing is active.
export default function ActiveFilters({
  categories, locationLabel, radiusMiles, focusedPlaceName,
  onRemoveCategory, onClearLocation, onChangeRadius, onClearFocusedPlace,
}: Props) {
  const hasFocusedPlace = !!focusedPlaceName;
  const hasCategories = categories.length > 0;
  const hasLocation = !!locationLabel;
  const activeFilterCount = categories.length + (hasLocation ? 1 : 0) + (hasFocusedPlace ? 1 : 0);

  if (!hasCategories && !hasLocation && !hasFocusedPlace) return null;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 16px 4px" }}>
        {hasFocusedPlace && (
          <Pill
            label={`📍 ${focusedPlaceName}`}
            onRemove={() => onClearFocusedPlace?.()}
            tone="ochre"
          />
        )}

        {categories.map((cat) => (
          <Pill key={cat} label={cat} onRemove={() => onRemoveCategory(cat)} />
        ))}

        {hasLocation && <Pill label={locationLabel!} onRemove={onClearLocation} />}

        {activeFilterCount >= 2 && (
          <button
            onClick={() => {
              categories.forEach(onRemoveCategory);
              onClearLocation();
              onClearFocusedPlace?.();
            }}
            style={{
              background: "none", border: "none", color: "var(--moor-light)",
              fontFamily: "'Nunito', sans-serif", fontSize: 11.5, fontWeight: 600,
              textDecoration: "underline", cursor: "pointer", padding: "4px 2px",
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Always visible the moment a location is active - not hidden
          behind a click, so the radius is genuinely easy to find and
          adjust right under the search bar. */}
      {hasLocation && (
        <RadiusSelector value={radiusMiles} onChange={onChangeRadius} onClear={onClearLocation} />
      )}
    </div>
  );
}

function Pill({ label, onRemove, tone = "moor" }: { label: string; onRemove: () => void; tone?: "moor" | "ochre" }) {
  const background = tone === "ochre" ? "var(--ochre-dark)" : "var(--moor)";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background, color: "var(--parchment)", borderRadius: 20,
        padding: "6px 6px 6px 13px", fontSize: 12.5, fontFamily: "'Nunito', sans-serif",
        fontWeight: 600, boxShadow: "0 1px 4px rgba(28,37,48,.2)",
      }}
    >
      <span>{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${label} filter`}
        style={{
          background: "rgba(255,255,255,.22)", border: "none", borderRadius: "50%",
          width: 18, height: 18, minWidth: 18, color: "#fff", fontSize: 10,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
        }}
      >
        ✕
      </button>
    </span>
  );
}
