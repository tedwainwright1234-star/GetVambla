"use client";

import { useEffect, useState } from "react";
import { isSaved, toggleSaved } from "@/lib/wishlist";

type Props = {
  placeName: string;
  size?: number;
};

export default function SaveButton({ placeName, size = 22 }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(placeName));
  }, [placeName]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSaved(toggleSaved(placeName));
      }}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      title={saved ? "Saved" : "Save"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={saved ? "var(--ochre)" : "none"}
        stroke={saved ? "var(--ochre)" : "var(--moor)"}
        strokeWidth={1.8}
      >
        <path d="M12 20s-7-4.5-9.5-9C1 8 2 4 6 4c2.3 0 3.7 1.3 6 3.5C14.3 5.3 15.7 4 18 4c4 0 5 4 3.5 7-2.5 4.5-9.5 9-9.5 9z" />
      </svg>
    </button>
  );
}
