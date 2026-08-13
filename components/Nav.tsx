"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Discover", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/map", label: "Map", icon: "M9 20l-6-2V4l6 2 6-2 6 2v14l-6-2-6 2zM9 4v16M15 6v16" },
  { href: "/wishlist", label: "Wishlist", icon: "M12 20s-7-4.5-9.5-9C1 8 2 4 6 4c2.3 0 3.7 1.3 6 3.5C14.3 5.3 15.7 4 18 4c4 0 5 4 3.5 7-2.5 4.5-9.5 9-9.5 9z" },
];

function NavIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={active ? "var(--ochre)" : "var(--parchment)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="vambla-bottom-nav">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className="vambla-bottom-nav-item">
            <NavIcon d={item.icon} active={active} />
            <span style={{ color: active ? "var(--ochre)" : "var(--parchment)" }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="vambla-top-nav">
      <span className="vambla-top-nav-brand">VAMBLA</span>
      <div style={{ display: "flex", gap: 28 }}>
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                textDecoration: "none",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: active ? "var(--ochre)" : "var(--parchment)",
              }}
            >
              <NavIcon d={item.icon} active={active} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
