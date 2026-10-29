import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Caveat, Geist, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed for low-vision readers; Noto covers Hindi;
// Plus Jakarta Sans is the rounded display face for the tablet's headings.
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "600"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
// The forest (landing page and sign-in) is set in Geist; Caveat is only for Kodi's speech bubble.
// both are variable fonts: no weight list, which also sidesteps a Turbopack dev error with multi-weight Google queries
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Remi AI",
  description: "Remi keeps a life: their voice, their stories, for the people who love them.",
};

export const viewport: Viewport = { themeColor: "#070B22" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${devanagari.variable} ${jakarta.variable} ${geist.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
