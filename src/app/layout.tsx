import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "VeloDoc Pro — Ultra-Premium Client-Side Document & PDF Studio",
  description:
    "100% private, on-device document studio with exact KB/MB binary-search compression, 30-document zero-crash batch engine, and 29 precision PDF & document tools. Zero server uploads.",
  keywords: [
    "PDF editor",
    "exact size PDF compressor",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "client-side PDF",
    "watermark PDF",
    "VeloDoc Pro",
    "zero upload PDF",
    "camera document scanner",
  ],
  authors: [{ name: "VeloDoc Pro Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#05060B] text-[#F8FAFC] flex flex-col min-h-dvh overflow-x-hidden selection:bg-indigo-500/30 selection:text-white relative`}
      >
        {/* Layer 1: Tactile Film-Grain Noise Texture Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.028] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Layer 2: Masked Architectural Dot Grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 architectural-grid opacity-85"
        />

        {/* Layer 2: Breathing Aurora Mesh Orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] ambient-aurora blur-[130px] opacity-25 z-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -top-32 right-[8%] w-[550px] h-[350px] ambient-aurora-cyan blur-[130px] opacity-20 z-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -top-32 left-[8%] w-[500px] h-[350px] ambient-aurora-emerald blur-[130px] opacity-15 z-0"
        />

        {/* App Content */}
        <div className="relative z-10 flex flex-col min-h-dvh flex-1 overflow-x-hidden">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
