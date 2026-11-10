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
  title: "VeloDoc Studio — Next-Gen Client-Side Document & PDF Studio",
  description:
    "100% In-browser PDF & document manipulation studio. Merge, split, compress, organize, watermark, and convert documents locally with zero server uploads and complete privacy.",
  keywords: [
    "PDF editor",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF to image",
    "client-side PDF",
    "watermark PDF",
    "VeloDoc Studio",
    "zero upload PDF",
  ],
  authors: [{ name: "VeloDoc Studio Team" }],
};

export const viewport: Viewport = {
  themeColor: "#090A0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#090A0F] text-[#F8FAFC] flex flex-col min-h-screen selection:bg-indigo-500/30 selection:text-white`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
