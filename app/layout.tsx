import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Vambla - Nearby Wonders",
  description: "Discover remarkable historical and natural places near you.",
};

// width/initialScale are the standard mobile-viewport settings Next.js
// normally sets automatically - providing a custom `viewport` export
// replaces that default entirely rather than adding to it, so they need
// to be listed explicitly here too. viewportFit: "cover" is the addition
// that lets the app draw edge-to-edge on iOS and report
// env(safe-area-inset-*) values (0 on Android/regular browsers, so this
// doesn't affect anything outside the native iOS app).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
