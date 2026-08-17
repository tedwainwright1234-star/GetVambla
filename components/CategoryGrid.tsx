"use client";

import { useRouter } from "next/navigation";
import CategoryIcon from "./CategoryIcon";
import { colorForCategory } from "@/lib/categoryStyle";

const CATEGORIES = [
  "Castle", "Ruin", "Historic Pub", "Stately Home", "Abbey/Priory",
  "Waterfall", "Beach", "Viewpoint", "Lighthouse", "Stone Circle",
  "Fort", "Windmill", "Church", "Historic Building", "Bridge", "Roman History",
  "Museum", "Monument", "Square", "Palace", "Historic Park", "Historic Site",
  "Archaeological Site", "Historic Brewery",
];

export default function CategoryGrid() {
  const router = useRouter();

  return (
    <section aria-labelledby="category-grid-heading" style={{ padding: "26px 20px 10px" }}>
      <h2
        id="category-grid-heading"
        style={{ fontFamily: "'Bitter', serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", margin: "0 0 16px", textAlign: "center" }}
      >
        Explore by category
      </h2>
      <div className="vambla-category-grid">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className="vambla-category-card"
            onClick={() => router.push(`/category/${encodeURIComponent(cat)}`)}
            aria-label={`Browse ${cat} places near you`}
            style={{ borderColor: `${colorForCategory(cat)}44` }}
          >
            <span
              className="vambla-category-icon"
              style={{ background: `${colorForCategory(cat)}1a`, borderColor: `${colorForCategory(cat)}55` }}
            >
              <CategoryIcon category={cat} size={32} />
            </span>
            <span className="vambla-category-label">{cat}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
