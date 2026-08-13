"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
};

export default function SearchBar({ value, onChange, onSubmit }: Props) {
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <label htmlFor="map-search" className="vambla-visually-hidden">
          Search by name, or try &quot;category in location&quot;
        </label>
        <input
          id="map-search"
          type="text"
          placeholder="Search, or try 'castles in York'…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
