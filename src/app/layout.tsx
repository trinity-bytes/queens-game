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

  useEffect(() => {
    // Apply dark class on mount based on initial state
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <html lang="es" suppressHydrationWarning className={darkMode ? "dark" : ""}>
      <head>
        <title>Queens 4 My Queen</title>
        <meta name="description" content="A special puzzle game for my queen" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0284c7" />
      </head>
      <body className="antialiased bg-sky-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <a href="#main-content" className="skip-to-content">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
