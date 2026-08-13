"use client";

type Props = {
  value: number | null; // null = "Anywhere" (no limit)
  onChange: (miles: number | null) => void;
  onClear: () => void;
};

const MAX = 100; // dragging to the far right means "100+ miles" = Anywhere

export default function RadiusSelector({ value, onChange, onClear }: Props) {
  const sliderValue = value === null ? MAX : value;
  const label = value === null ? "Anywhere" : `${value} mile${value === 1 ? "" : "s"}`;

  function handleSlide(raw: number) {
    onChange(raw >= MAX ? null : raw);
  }

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
            fontFamily: "'IBM Plex Mono', monospace",
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
            fontFamily: "'IBM Plex Mono', monospace",
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
          value={sliderValue}
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
