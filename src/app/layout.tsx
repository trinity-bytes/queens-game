"use client";

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const darkMode = useGameStore((state) => state.darkMode);
  const theme = useGameStore((state) => state.theme);

  useEffect(() => {
    // Apply dark class on mount based on initial state
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${darkMode ? "dark" : ""} theme-${theme}`}
    >
      <head>
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
      </head>
      <body className="antialiased text-slate-900 dark:text-slate-100">
        <a href="#main-content" className="skip-to-content">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
