"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Discover", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/map", label: "Map", icon: "M9 20l-6-2V4l6 2 6-2 6 2v14l-6-2-6 2zM9 4v16M15 6v16" },
  { href: "/wishlist", label: "Wishlist", icon: "M12 20s-7-4.5-9.5-9C1 8 2 4 6 4c2.3 0 3.7 1.3 6 3.5C14.3 5.3 15.7 4 18 4c4 0 5 4 3.5 7-2.5 4.5-9.5 9-9.5 9z" },
];

type Variant = "top" | "bottom";

// The "Map" nav item is a bare "/map" link - fine when coming from
// elsewhere, but if the person is ALREADY on the map with a search
// active (category/location/radius/place in the URL) and clicks it
// again, a bare link would silently drop all of that and reload a blank
// map. This keeps the current query string attached whenever the target
// is the page you're already on.
function mapHrefFor(itemHref: string, currentPathname: string, currentSearch: string) {
  if (itemHref === "/map" && currentPathname === "/map" && currentSearch) {
    return `/map?${currentSearch}`;
  }
  return itemHref;
}

function NavIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={active ? "var(--ochre)" : "var(--parchment)"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const topNavLinkStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 700,
  fontSize: 14.5,
  color: active ? "var(--ochre)" : "var(--parchment)",
});

function NavItemLink({ href, icon, label, active, variant }: { href: string; icon: string; label: string; active: boolean; variant: Variant }) {
  return variant === "bottom" ? (
    <Link href={href} className="vambla-bottom-nav-item">
      <NavIcon d={icon} active={active} />
      <span style={{ color: active ? "var(--ochre)" : "var(--parchment)" }}>{label}</span>
    </Link>
  ) : (
    <Link href={href} style={topNavLinkStyle(active)}>
      <NavIcon d={icon} active={active} />
      {label}
    </Link>
  );
}

// useSearchParams() forces Next.js to de-opt this part of the page from
// static prerendering unless it's wrapped in <Suspense> - without that,
// production builds fail outright ("should be wrapped in a suspense
// boundary") on every page that renders the nav, which is every page.
// Isolating it in its own tiny component (rather than calling it in
// TopNav/BottomNav directly) means only this sliver needs Suspense, and
// every page gets the fix for free without changing anything else.
function NavLinks({ pathname, variant }: { pathname: string; variant: Variant }) {
  const search = useSearchParams().toString();
  return (
    <>
      {ITEMS.map((item) => (
        <NavItemLink
          key={item.href}
          href={mapHrefFor(item.href, pathname, search)}
          icon={item.icon}
          label={item.label}
          active={pathname === item.href}
          variant={variant}
        />
      ))}
    </>
  );
}

// Plain fallback (no query-preserving href) shown only for the brief
// static-render pass before the client takes over - not a regression,
// just what these links always looked like before that enhancement.
function NavLinksFallback({ pathname, variant }: { pathname: string; variant: Variant }) {
  return (
    <>
      {ITEMS.map((item) => (
        <NavItemLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={pathname === item.href}
          variant={variant}
        />
      ))}
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="vambla-bottom-nav">
      <Suspense fallback={<NavLinksFallback pathname={pathname} variant="bottom" />}>
        <NavLinks pathname={pathname} variant="bottom" />
      </Suspense>
    </nav>
  );
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="vambla-top-nav">
      <Link href="/" style={{ display: "flex", alignItems: "center" }} aria-label="Vambla home">
        <img src="/vambla-icon.png" alt="Vambla" height={44} style={{ height: 44, width: "auto" }} />
      </Link>
      <div style={{ display: "flex", gap: 28 }}>
        <Suspense fallback={<NavLinksFallback pathname={pathname} variant="top" />}>
          <NavLinks pathname={pathname} variant="top" />
        </Suspense>
      </div>
    </nav>
  );
}
