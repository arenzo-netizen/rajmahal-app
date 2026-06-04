import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Rajmahal Schkeuditz – Online Bestellen",
  description: "Authentische indische Küche. Jetzt online bestellen – Abholung oder Lieferung. Bezahlung per PayPal.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rajmahal",
  },
};

export const viewport: Viewport = {
  themeColor: "#b45309",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={geist.variable}>
      <body className="min-h-screen antialiased flex flex-col">
          <main className="flex-1">{children}</main>
          <footer className="bg-[#1a0e06] border-t border-[#3d2008] text-center py-4 text-xs text-[#705040] space-x-4">
            <a href="/impressum" className="hover:text-[#c9a23a] transition-colors">Impressum</a>
            <span>·</span>
            <span>© {new Date().getFullYear()} Rajmahal Schkeuditz</span>
            <span>·</span>
            <a href="/admin" className="hover:text-[#c9a23a] transition-colors">Admin</a>
          </footer>
        </body>
    </html>
  );
}
