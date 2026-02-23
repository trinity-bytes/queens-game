"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BackgroundPattern from "@/components/BackgroundPattern";

export default function CreditsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-8 sm:pt-[calc(env(safe-area-inset-top)+2rem)] bg-theme-bg transition-colors duration-300 relative z-0">
      <BackgroundPattern />

      <div className="w-full max-w-2xl bg-theme-surface rounded-xl shadow-sm p-6 mt-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
          <Link
            href="/"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-theme-text"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-theme-text">
            Créditos y Licencias
          </h1>
        </div>

        <div className="space-y-6 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-theme-text mb-3">
              Iconos de Flaticon
            </h2>
            <p className="text-sm mb-3">
              Los siguientes iconos son gratuitos para uso personal y comercial
              con atribución, creados por autores en Flaticon:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/dog"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Dog icons created by Freepik - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/cow"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Cow icons created by Aranagraphics - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/potato"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Potato icons created by Freepik - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.es/iconos-gratis/corona-3d"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Corona 3d iconos creados por Freepik - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/play-button"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Play button icons created by NajmunNahar - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/moon"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Moon icons created by Good Ware - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/weather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Weather icons (Sun) created by Freepik - Flaticon
                </a>
              </li>
              <li>
                <a
                  href="https://www.flaticon.com/free-icons/award"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Award icons (Trophy) created by Freepik - Flaticon
                </a>
              </li>
              <li>
                <strong>Favicon y App Icons:</strong> Designed by Freepik
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-theme-text mb-3">
              Otros Recursos
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>Dinosaurio (Parasaurolophus):</strong> Imagen generada
                con IA (Google Nanobanana Pro).
              </li>
              <li>
                <strong>Stormtrooper (Star Wars):</strong> Extraído de{" "}
                <a
                  href="https://artpictures.club/autumn-2023.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  artpictures.club
                </a>
                .
              </li>
              <li>
                <strong>Marca X (X-mark):</strong> Extraído de{" "}
                <a
                  href="https://ena.our-dogs.info/facts-ph.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  ena.our-dogs.info
                </a>
                .
              </li>
              <li>
                <strong>Patrones SVG adicionales:</strong> Obtenidos de{" "}
                <a
                  href="https://www.svgrepo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  SVG Repo
                </a>
                .
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
