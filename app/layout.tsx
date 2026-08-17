import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vambla - Nearby Wonders",
  description: "Discover remarkable historical and natural places near you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
