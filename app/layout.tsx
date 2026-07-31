import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "EBD Fiel Podcast",
  description: "Transforme a lição da semana em um podcast cristão para sua classe.",
  manifest: "/manifest.webmanifest",
  applicationName: "EBD Fiel Podcast",
  appleWebApp: { capable: true, title: "EBD Podcast", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: { "codex-preview": "development" },
};

export const viewport: Viewport = {
  themeColor: "#0b4f88",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
