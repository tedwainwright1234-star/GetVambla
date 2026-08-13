"use client";

type Props = {
  lat: number;
  lng: number;
  label?: string;
  compact?: boolean;
};

// Google Maps' universal web URL works as a directions link on every
// platform (desktop browser, iOS, Android) - on mobile, the OS generally
// offers to open it in the user's preferred installed maps app, and it
// falls back to opening in the browser otherwise. This is the safest
// "universal" link without needing to sniff user agents unreliably.
function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export default function DirectionsButton({ lat, lng, label = "Directions", compact }: Props) {
  return (
    <a
      href={directionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Get directions to this place`}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        textDecoration: "none",
        background: "var(--moor)",
        color: "#fff",
        fontSize: compact ? 11.5 : 13,
        fontWeight: 600,
        padding: compact ? "6px 10px" : "9px 14px",
        borderRadius: 7,
      }}
    >
      <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11l18-8-8 18-2-8-8-2z" />
      </svg>
      {label}
    </a>
  );
}
