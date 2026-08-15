"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (value: string) => void;
};

// Keeps its own local state for what's on screen, and only pushes changes
// up to the parent after a short debounce. Typing used to update the
// parent (Explorer) on every single keystroke, which re-rendered the
// whole map/marker tree each time and felt laggy, especially on mobile.
// Now the input itself stays instantly responsive, and the parent - which
// drives the live name-search results - only hears about it once typing
// pauses. Submitting (Enter) always uses the freshest text immediately,
// never waiting on the debounce.
export default function SearchBar({ value, onChange, onSubmit }: Props) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync when the parent resets the value from outside (e.g.
  // clearing the box after a place is selected).
  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(next: string) {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 250);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange(local);
    onSubmit?.(local);
  }

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="map-search" className="vambla-visually-hidden">
          Search by name, or try &quot;category in location&quot;
        </label>
        <input
          id="map-search"
          type="text"
          placeholder="Search, or try 'castles in York'…"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            border: "1.5px solid var(--moor)",
            borderRadius: 4,
            background: "#fff",
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </form>
    </div>
  );
}
