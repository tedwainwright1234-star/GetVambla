import { colorForCategory } from "@/lib/categoryStyle";

// Minimal geometric SVG icons per category. Each returns a path string
// drawn on a 24x24 viewBox, plus a semantic label used for alt text.
// Kept intentionally simple/consistent rather than deeply illustrated -
// clarity and recognisability at small map-marker sizes matters more
// than decorative detail.
type IconDef = { viewBox: string; paths: string[] };

const ICONS: Record<string, IconDef> = {
  Castle: {
    viewBox: "0 0 24 24",
    paths: ["M3 22V9l2-2v2h2V7l2-2v2h2V5l2-2 2 2v2h2V7l2-2v2h2v2l2 2v11H3z"],
  },
  Ruin: {
    viewBox: "0 0 24 24",
    paths: ["M4 22V13l2-9h2l1 7h6l1-7h2l2 9v9H4z"],
  },
  "Historic Pub": {
    viewBox: "0 0 24 24",
    paths: ["M6 3h8l-1 15a3 3 0 0 1-6 0L6 3zM14 6h2.5a2.5 2.5 0 0 1 0 5H14"],
  },
  "Stately Home": {
    viewBox: "0 0 24 24",
    paths: ["M12 3l9 7v12H3V10l9-7zM10 22v-6h4v6"],
  },
  "Historic Building": {
    viewBox: "0 0 24 24",
    paths: ["M2 9l10-6 10 6v2H2V9zM4 22V12h3v10zM10.5 22V12h3v10zM17 22V12h3v10z"],
  },
  "Abbey/Priory": {
    viewBox: "0 0 24 24",
    paths: ["M12 2C8 6 6 10 6 22h12C18 10 16 6 12 2z"],
  },
  Church: {
    viewBox: "0 0 24 24",
    paths: ["M11 1h2v2h2v2h-2v1.2l4 3.3V22H7V9.5l4-3.3V5H9V3h2V1z"],
  },
  Fort: {
    viewBox: "0 0 24 24",
    paths: ["M3 22V13h3v-2h3v2h3v-2h3v2h3v-2h3v2h3V22z"],
  },
  "Roman History": {
    viewBox: "0 0 24 24",
    paths: ["M4 3h16v2H4zM4 20h16v2H4zM6 6h3v13H6zM10.5 6h3v13h-3zM15 6h3v13h-3z"],
  },
  Bridge: {
    viewBox: "0 0 24 24",
    paths: ["M2 14c3-5 7-7 10-7s7 2 10 7v3c-3-5-7-7-10-7s-7 2-10 7v-3zM4 21V15h2v6zM18 21V15h2v6z"],
  },
  Lighthouse: {
    viewBox: "0 0 24 24",
    paths: ["M9 8l1-6h4l1 6-1 14h-4L9 8z", "M3.5 13.5l4-2 .7 1.3-4 2zM20.5 13.5l-4-2-.7 1.3 4 2z"],
  },
  Windmill: {
    viewBox: "0 0 24 24",
    paths: ["M10.7 13h2.6l.5 9h-3.6z", "M12 12L4 8l3-5zM12 12l8-4-3-5zM12 12l3 8-6 1z"],
  },
  "Stone Circle": {
    viewBox: "0 0 24 24",
    paths: ["M4 21V9h3v12zM10.5 21V6h3v15zM17 21V10h3v11z"],
  },
  Beach: {
    viewBox: "0 0 24 24",
    paths: ["M12 3a5 5 0 0 1 5 5c0 3-5 8-5 8s-5-5-5-8a5 5 0 0 1 5-5z", "M4 21c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0"],
  },
  Viewpoint: {
    viewBox: "0 0 24 24",
    paths: ["M2 19l6-11 4 6 2-3 6 8H2zM17 5a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 17 5z"],
  },
  Waterfall: {
    viewBox: "0 0 24 24",
    paths: ["M5 3h14l-2 6H7L5 3z", "M7.3 9h1.4l-.7 6zM11.3 9h1.4l-.7 11zM15.3 9h1.4l-.7 6z"],
  },
  River: {
    viewBox: "0 0 24 24",
    paths: ["M3 8c4 3 4 6 9 6s5-3 9-6M3 15c4 3 4 6 9 6s5-3 9-6"],
  },
  Lake: {
    viewBox: "0 0 24 24",
    paths: ["M4 17l4-9 3 5 2-3 3 5 4-9v13H4z"],
  },
  Mountain: {
    viewBox: "0 0 24 24",
    paths: ["M2 21L9 5l4 8 2-3 7 11H2z"],
  },
  Woodland: {
    viewBox: "0 0 24 24",
    paths: ["M7 13l3-8 3 8H7zM13 15l3-8 3 8h-6zM9 13v8M16 15v6"],
  },
  Forest: {
    viewBox: "0 0 24 24",
    paths: ["M7 13l3-8 3 8H7zM13 15l3-8 3 8h-6zM9 13v8M16 15v6"],
  },
  Moor: {
    viewBox: "0 0 24 24",
    paths: ["M2 15c3-4 6-4 9 0s6 4 9 0v3c-3 4-6 4-9 0s-6-4-9 0z"],
  },
  "Rock Formation": {
    viewBox: "0 0 24 24",
    paths: ["M3 21l3-11 3 5 3-7 3 6 3-9 3 16H3z"],
  },
  Valley: {
    viewBox: "0 0 24 24",
    paths: ["M2 6l10 5 10-5-10 15L2 6z"],
  },
  Cliffs: {
    viewBox: "0 0 24 24",
    paths: ["M2 22V12l5-3v13zM7 9l5-4v17H7zM12 5l5 2v15h-5z"],
  },
  Hill: {
    viewBox: "0 0 24 24",
    paths: ["M2 20c2-8 5-11 7-11s4 5 4 5 2-3 4-3 4 6 5 9z"],
  },
  Island: {
    viewBox: "0 0 24 24",
    paths: ["M6 18l3-9 3 5 4-8 3 12H6z", "M2 20c3-1.5 5-1.5 8 0s7 1.5 10 0"],
  },
  Wetland: {
    viewBox: "0 0 24 24",
    paths: ["M4 16c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0 2-3 3 0M3 21h18"],
  },
  Wetlands: {
    viewBox: "0 0 24 24",
    paths: ["M4 16c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0 2-3 3 0M3 21h18"],
  },
  "Nature Reserve": {
    viewBox: "0 0 24 24",
    paths: ["M12 2c3.5 4 6 8 6 12a6 6 0 0 1-12 0c0-4 2.5-8 6-12z"],
  },
  "Natural Beauty": {
    viewBox: "0 0 24 24",
    paths: ["M12 2c3.5 4 6 8 6 12a6 6 0 0 1-12 0c0-4 2.5-8 6-12z"],
  },

  // --- Added for the Brussels dataset ---
  Museum: {
    viewBox: "0 0 24 24",
    paths: ["M2 10L12 3l10 7v1H2z", "M4 11h3v9H4zM10.5 11h3v9h-3zM17 11h3v9h-3z", "M2 21h20v1H2z"],
  },
  Monument: {
    viewBox: "0 0 24 24",
    paths: ["M10 2h4l1 13h-6z", "M7 15h10l2 7H5z"],
  },
  Square: {
    viewBox: "0 0 24 24",
    paths: ["M3 3h18v18H3V3zm2 2v14h14V5H5z", "M9 9h6v6H9z"],
  },
  Palace: {
    viewBox: "0 0 24 24",
    paths: ["M12 2a3 3 0 0 1 3 3v2h3v3h-2v11H8V10H6V7h3V5a3 3 0 0 1 3-3z"],
  },
  "Historic Park": {
    viewBox: "0 0 24 24",
    paths: ["M12 2c2.5 3 4 6 4 9a4 4 0 1 1-8 0c0-3 1.5-6 4-9z", "M11 11h2v11h-2z", "M4 20h16v1H4z"],
  },
  "Historic Site": {
    viewBox: "0 0 24 24",
    paths: ["M6 2v20h2v-8h10l-3-3 3-3H8V2z"],
  },
  "Archaeological Site": {
    viewBox: "0 0 24 24",
    paths: ["M3 6h18v3H3z", "M5 11h14v10H5z", "M9 14h2v4H9zM13 14h2v4h-2z"],
  },
  "Historic Brewery": {
    viewBox: "0 0 24 24",
    paths: ["M6 4h12l1 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z", "M4 8h16M4 13h16"],
  },
};

const DEFAULT_ICON: IconDef = {
  viewBox: "0 0 24 24",
  paths: ["M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 14v8"],
};

export function iconDefForCategory(category: string): IconDef {
  return ICONS[category] ?? DEFAULT_ICON;
}

type Props = {
  category: string;
  size?: number;
};

export default function CategoryIcon({ category, size = 20 }: Props) {
  const def = iconDefForCategory(category);
  const color = colorForCategory(category);
  return (
    <svg
      width={size}
      height={size}
      viewBox={def.viewBox}
      fill={color}
      stroke="none"
      aria-label={category}
    >
      {def.paths.map((d, i) => (
        <path key={i} d={d} fillRule="evenodd" />
      ))}
    </svg>
  );
}
