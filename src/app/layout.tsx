import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Queens 4 My Queen",
  description: "A special puzzle game for my queen",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-sky-50 text-slate-900">{children}</body>
    </html>
  );
}
