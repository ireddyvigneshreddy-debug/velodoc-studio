import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const serifFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://velodoc-studio.vercel.app"),
  title: {
    default: "VeloDoc Studio — Swiss Precision Document Workbench",
    template: "%s | VeloDoc Studio",
  },
  description:
    "100% private, on-device document studio with exact KB/MB binary-search compression, 30-document zero-crash batch engine, precision PDF tools, and official academic presentation studio. Zero server uploads.",
  keywords: [
    "PDF editor",
    "exact size PDF compressor",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "client-side PDF",
    "watermark PDF",
    "VeloDoc Studio",
    "zero upload PDF",
    "camera document scanner",
    "academic presentation generator",
    "IARE Tech Talk generator",
  ],
  authors: [{ name: "VeloDoc Studio Engineering Team", url: "https://github.com/vigneshreddy-dev/velodoc-studio" }],
  creator: "VeloDoc Studio",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://velodoc-studio.vercel.app",
    siteName: "VeloDoc Studio",
    title: "VeloDoc Studio — Swiss Precision Document Workbench",
    description:
      "100% private, client-side document workbench with exact size compression, 30-file batch queue & academic presentations. Zero cloud uploads.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VeloDoc Studio — Swiss Precision Document Workbench",
    description:
      "100% private, client-side document workbench with exact size compression, 30-file batch queue & academic presentations. Zero cloud uploads.",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F6F2",
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
    <html
      lang="en"
      className={`${serifFont.variable} ${sansFont.variable} ${monoFont.variable} light scroll-smooth`}
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className="antialiased bg-[#F7F6F2] text-[#18181B] dark:bg-[#161615] dark:text-[#F7F6F2] flex flex-col min-h-dvh overflow-x-hidden selection:bg-[#C2410C]/20 selection:text-[#18181B] relative transition-colors duration-200">
        {/* Subtle Architectural Dot Grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 architectural-grid opacity-50 dark:opacity-20"
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
