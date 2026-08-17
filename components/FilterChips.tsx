"use client";

import { useState } from "react";

type Props = {
  categories: string[];
  active: string[]; // empty array = "All"
  onSelect: (cat: string) => void; // toggles the given category on/off ("All" clears everything)
  defaultOpen?: boolean;
};

// Multi-select: tap "All" to clear every category filter, or tap any
// number of individual categories to combine them (e.g. Castles + Ruins
// both shown at once). Each tap toggles that one category on or off -
// the caller (Explorer) owns the actual add/remove logic.
//
// Collapsible: the category list has grown (now spans multiple
// countries/cities), so it's collapsed by default to keep the sidebar
// compact - the header always shows how many categories are active,
// even while collapsed, so an active filter is never hidden from view.
export default function FilterChips({ categories, active, onSelect, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen || active.length > 0);

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "14px 16px",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--moor-light)",
          }}
        >
          Filter by category{active.length > 0 ? ` (${active.length})` : ""}
        </span>
        <svg
          width={14} height={14} viewBox="0 0 24 24" fill="none"
          stroke="var(--moor-light)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 14px" }}>
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
      )}
    </div>
  );
}
