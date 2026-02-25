"use client";

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { useGameStore } from "@/store/gameStore";
import { ThemeScript } from "@/components/ThemeScript";
import LoadingScreen from "@/components/LoadingScreen";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const darkMode = useGameStore((state) => state.darkMode);
  const theme = useGameStore((state) => state.theme);

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${darkMode ? "dark" : ""} theme-${theme}`}
    >
      <head>
        <ThemeScript />
        <title>Queens 4 My Queen</title>
        <meta name="description" content="A special puzzle game for my queen" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={darkMode ? "#0f172a" : "#f0f9ff"} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preload" as="image" href="/assets/figures/dino.png" />
        <link rel="preload" as="image" href="/assets/figures/dog.png" />
        <link rel="preload" as="image" href="/assets/figures/cow.png" />
        <link rel="preload" as="image" href="/assets/figures/potato.png" />
        <link rel="preload" as="image" href="/assets/figures/starwars.png" />
      </head>
      <body className="antialiased text-slate-900 dark:text-slate-100">
        <LoadingScreen />
        <a href="#main-content" className="skip-to-content">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
