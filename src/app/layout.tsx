import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import RoleThemeProvider from "@/components/RoleThemeProvider";
import Sidebar from "@/components/Sidebar";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Touchline Inventory",
  description: "Track. Manage. Stay Ahead. — Materials sourcing & inventory management for signage and branding.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  metadataBase: new URL("https://app.touchlineltd.co.ke"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("next-auth.session-token")?.value;
  const isAuthenticated = !!sessionToken;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable} ${playfair.variable}`}>
        {/* Ambient effects */}
        <div className="gradient-bg" />
        <div className="noise-overlay" />

        <Providers>
          <RoleThemeProvider>
            <Sidebar />
            <AppShell isAuthenticated={isAuthenticated}>{children}</AppShell>
          </RoleThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
