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
    paths: [
      "M4 21V11H2v-2h3V7h2v2h2V6h2v3h2V6h2v3h2V7h2v2h3v2h-2v10H4z",
      "M10 21v-6h4v6",
    ],
  },
  Ruin: {
    viewBox: "0 0 24 24",
    paths: ["M4 21V13l2-9h1l1 7h1l1-9h4l1 9h1l1-7h1l2 9v8H4z", "M9 21v-5M15 21v-5"],
  },
  "Historic Pub": {
    viewBox: "0 0 24 24",
    paths: [
      "M7 2h8l-1 15a3 3 0 0 1-6 0L7 2z",
      "M15 5h2.5a3 3 0 0 1 0 6H15",
      "M6 22h10",
    ],
  },
  "Stately Home": {
    viewBox: "0 0 24 24",
    paths: [
      "M3 22V9l9-6 9 6v13H3z",
      "M7 22v-8h3v8M14 22v-8h3v8",
      "M9 4.5V2h2v1.7",
    ],
  },
  "Historic Building": {
    viewBox: "0 0 24 24",
    paths: ["M3 22V8l9-5 9 5v14H3z", "M3 8h18", "M7 22v-9h10v9", "M9 6.5V4h6v2.5"],
  },
  "Abbey/Priory": {
    viewBox: "0 0 24 24",
    paths: [
      "M12 2l2.5 4h-5L12 2z",
      "M5 22V9a7 7 0 0 1 14 0v13H5z",
      "M10 22v-7a2 2 0 0 1 4 0v7",
    ],
  },
  Church: {
    viewBox: "0 0 24 24",
    paths: ["M12 1.5v3M10.3 3.2h3.4", "M6 22V10l6-4.5L18 10v12H6z", "M10 22v-7a2 2 0 0 1 4 0v7"],
  },
  Fort: {
    viewBox: "0 0 24 24",
    paths: ["M3 22V12H1v-2h3V8h2v2h2V8h2v2h4V8h2v2h2V8h2v2h3v2h-2v10H3z"],
  },
  "Roman History": {
    viewBox: "0 0 24 24",
    paths: [
      "M6 21V9M18 9v12",
      "M4 9h4M16 9h4",
      "M6 9V6h0M18 9V6",
      "M9 21h6",
      "M6 5h12",
    ],
  },
  Bridge: {
    viewBox: "0 0 24 24",
    paths: ["M3 16c2-4 6-6 9-6s7 2 9 6", "M5 20V14M19 20V14", "M3 20h18"],
  },
  Lighthouse: {
    viewBox: "0 0 24 24",
    paths: ["M10 22l1-14h2l1 14h-4z", "M9 8l1-5h4l1 5H9z", "M7 12h10"],
  },
  Windmill: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 12v10",
      "M12 12l6-5-2 6z",
      "M12 12l-6-5 2 6z",
      "M12 12l-1 7 5-3z",
    ],
  },
  "Stone Circle": {
    viewBox: "0 0 24 24",
    paths: [
      "M5 8v6M9 5v14M13 5v14M17 8v6",
      "M4 20h4M8 20h0M11 20h4M16 20h4",
    ],
  },
  Beach: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 3C7 3 3 8 3 8h18S17 3 12 3z",
      "M12 8v13",
      "M8 21c1-1 2-1.5 4-1.5s3 .5 4 1.5",
    ],
  },
  Viewpoint: {
    viewBox: "0 0 24 24",
    paths: ["M3 18l6-9 4 5 3-4 5 8H3z", "M6 6a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"],
  },
  Waterfall: {
    viewBox: "0 0 24 24",
    paths: [
      "M6 3h12l-2 5H8L6 3z",
      "M8 8v6M12 8v8M16 8v6",
      "M3 21c2-1 4 1 6 0s4-1 6 0 4 1 6 0",
    ],
  },
  River: {
    viewBox: "0 0 24 24",
    paths: ["M4 6c4 2 4 5 8 5s4-3 8-5M4 12c4 2 4 5 8 5s4-3 8-5"],
  },
  Lake: {
    viewBox: "0 0 24 24",
    paths: [
      "M3 15c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0",
      "M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0",
      "M8 15l3-8 2 4 2-3 3 7",
    ],
  },
  Mountain: {
    viewBox: "0 0 24 24",
    paths: ["M2 20L9 6l4 7 2-3 7 10H2z", "M9 6l1.5 3-1 2"],
  },
  Woodland: {
    viewBox: "0 0 24 24",
    paths: [
      "M7 14l3-7 3 7H7z",
      "M13 16l3-8 3 8h-6z",
      "M9 14v6M16 16v4",
    ],
  },
  Forest: {
    viewBox: "0 0 24 24",
    paths: [
      "M7 14l3-7 3 7H7z",
      "M13 16l3-8 3 8h-6z",
      "M9 14v6M16 16v4",
    ],
  },
  Moor: {
    viewBox: "0 0 24 24",
    paths: ["M3 17c3-3 6-3 9 0s6 3 9 0", "M3 21c3-3 6-3 9 0s6 3 9 0"],
  },
  "Rock Formation": {
    viewBox: "0 0 24 24",
    paths: ["M4 21l3-9 3 4 2-5 3 6 3-8 2 12H4z"],
  },
  Valley: {
    viewBox: "0 0 24 24",
    paths: ["M2 8l7 12h6L22 8", "M2 8l10 4 10-4"],
  },
  Cliffs: {
    viewBox: "0 0 24 24",
    paths: ["M2 21V13l5-3v-2l4-2v3l4-2v3l5-3v14H2z"],
  },
  Hill: {
    viewBox: "0 0 24 24",
    paths: ["M2 18c3-6 6-9 6-9s3 3 6 9 6 3 8 0", "M2 21h20"],
  },
  Island: {
    viewBox: "0 0 24 24",
    paths: [
      "M3 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0",
      "M8 17l2-8 2 4 3-6 2 10",
    ],
  },
  Wetland: {
    viewBox: "0 0 24 24",
    paths: ["M4 18c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0 2-3 3 0", "M3 21h18"],
  },
  Wetlands: {
    viewBox: "0 0 24 24",
    paths: ["M4 18c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0 2-3 3 0", "M3 21h18"],
  },
  "Nature Reserve": {
    viewBox: "0 0 24 24",
    paths: ["M12 2c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z", "M12 22v-5"],
  },
  "Natural Beauty": {
    viewBox: "0 0 24 24",
    paths: ["M12 2c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z", "M12 22v-5"],
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
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={category}
    >
      {def.paths.map((d, i) => (
        // The first path is the main silhouette for every icon in this
        // set - filling it with a soft tint of the category colour (and
        // keeping the bolder stroke on top) gives a friendlier, more
        // "designed" two-tone look instead of a thin outline only.
        <path key={i} d={d} fill={i === 0 ? color : "none"} fillOpacity={i === 0 ? 0.18 : 0} />
      ))}
    </svg>
  );
}
