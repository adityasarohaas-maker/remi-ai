import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed for low-vision readers; Noto covers Hindi.
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Remi AI",
  description: "A gentle AI companion for people living with dementia, and the families who care for them.",
};

export const viewport: Viewport = { themeColor: "#2F5D50" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
