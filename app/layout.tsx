import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vambla — nearby wonders",
  description: "Discover historical and natural wonders near you across the UK & Ireland.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
