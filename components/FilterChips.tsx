"use client";

type Props = {
  categories: string[];
  active: string[]; // empty array = "All"
  onSelect: (cat: string) => void; // toggles the given category on/off ("All" clears everything)
};

// Multi-select: tap "All" to clear every category filter, or tap any
// number of individual categories to combine them (e.g. Castles + Ruins
// both shown at once). Each tap toggles that one category on or off -
// the caller (Explorer) owns the actual add/remove logic.
export default function FilterChips({ categories, active, onSelect }: Props) {
  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
      <span
        style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--moor-light)",
          marginBottom: 8,
          display: "block",
        }}
      >
        Filter by category
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {categories.map((cat) => {
          const isActive = cat === "All" ? active.length === 0 : active.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              aria-pressed={isActive}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 11px",
                border: "1.5px solid var(--moor)",
                color: isActive ? "var(--parchment)" : "var(--moor)",
                background: isActive ? "var(--moor)" : "transparent",
                borderRadius: 20,
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
