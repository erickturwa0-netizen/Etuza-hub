import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import AdsterraScripts from "@/components/AdsterraScripts";

export const metadata: Metadata = {
  title: "ETUZA HUB – Movies, Games & VPN",
  description: "Movies, Android Games & VPN configs – ETUZA HUB Tanzania",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sw">
      <body className="min-h-screen flex flex-col bg-[#0a0a0f] text-slate-100 overflow-x-hidden">
        <Navbar />
        <div className="flex-1 flex flex-col pb-16 md:pb-0 min-w-0">{children}</div>
        <Footer />
        <BottomNav />
        <AdsterraScripts />
      </body>
    </html>
  );
}
