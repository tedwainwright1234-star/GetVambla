"use client";

import { useState } from "react";
import { colorForCategory } from "@/lib/categoryStyle";
import { iconDefForCategory } from "./CategoryIcon";

type Props = {
  categories: string[];
};

function LegendIcon({ category }: { category: string }) {
  const def = iconDefForCategory(category);
  const color = colorForCategory(category);
  return (
    <div
      style={{
        width: 24, height: 24, borderRadius: "50%", background: color,
        border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <svg viewBox={def.viewBox} width={13} height={13} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {def.paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </div>
  );
}

export default function MapLegend({ categories }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute", bottom: 14, left: 14, zIndex: 900,
        background: "rgba(255,255,255,0.96)", borderRadius: 10,
        boxShadow: "0 2px 12px rgba(28,37,48,0.25)",
        maxWidth: 220, fontFamily: "'Inter', sans-serif",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Nunito', sans-serif", fontSize: 10.5, letterSpacing: 1,
          textTransform: "uppercase", color: "var(--ink)",
        }}
      >
        Key
        <span style={{ fontSize: 12 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 10px", maxHeight: 220, overflowY: "auto" }}>
          {categories.map((cat) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <LegendIcon category={cat} />
              <span style={{ fontSize: 12, color: "var(--ink)" }}>{cat}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
