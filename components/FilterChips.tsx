"use client";

type Props = {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
};

export default function FilterChips({ categories, active, onSelect }: Props) {
  return (
    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
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
          const isActive = cat === active;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
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
