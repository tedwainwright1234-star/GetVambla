"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number | null; // null = "Anywhere" (no limit)
  onChange: (miles: number | null) => void;
  onClear: () => void;
};

const MAX = 100; // dragging to the far right means "100+ miles" = Anywhere

// Keeps its own local value for instant, smooth dragging, and only
// commits to the parent (which triggers the actual places re-fetch)
// once the drag settles for a moment. Without this, every single pixel
// of movement fired a brand new network request - on a slow connection
// the very first (smallest radius) request could easily be the one that
// happens to land last and "win", which is exactly what made it look
// like the radius was stuck on the original value even though you'd
// dragged it further.
export default function RadiusSelector({ value, onChange, onClear }: Props) {
  const [local, setLocal] = useState(value === null ? MAX : value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync when the parent value changes from outside (e.g. a
  // fresh location search setting a new default radius).
  useEffect(() => {
    setLocal(value === null ? MAX : value);
  }, [value]);

  function handleSlide(raw: number) {
    setLocal(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(raw >= MAX ? null : raw);
    }, 300);
  }

  const label = local >= MAX ? "Anywhere" : `${local} mile${local === 1 ? "" : "s"}`;

  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 10,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--moor-light)",
          }}
        >
          Within
        </span>
        <span
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--brick)",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min={1}
          max={MAX}
          step={1}
          value={local}
          onChange={(e) => handleSlide(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: "var(--ochre)",
            cursor: "pointer",
          }}
        />
        <button
          onClick={onClear}
          title="Stop showing places near me"
          style={{
            border: "1.5px solid var(--moor)",
            background: "transparent",
            color: "var(--moor)",
            borderRadius: 4,
            padding: "6px 9px",
            fontSize: 12,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
