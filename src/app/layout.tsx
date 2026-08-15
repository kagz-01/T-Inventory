import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Signage Materials Platform",
  description: "Materials sourcing & inventory management for branding and signage work",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1F3864",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
