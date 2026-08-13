/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode double-invokes effects in dev to help catch bugs, but
  // Leaflet's MapContainer doesn't handle being initialized twice on the
  // same DOM node - that's what causes "Map container is already
  // initialized." This only affects local dev; production builds don't
  // double-invoke effects anyway, so this is a safe, low-risk change.
  reactStrictMode: false,
};

export default nextConfig;
