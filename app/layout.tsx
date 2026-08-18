import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Vambla - Nearby Wonders",
  description: "Discover remarkable historical and natural places near you.",
};

// viewportFit: "cover" lets the app draw edge-to-edge on iOS and report
// env(safe-area-inset-*) values - without it those all resolve to 0 and
// fixed bottom bars sit under the home-indicator gesture area in the
// native app (this doesn't affect the regular browser site at all).
export const viewport: Viewport = {
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
