import { useGameStore } from "@/store/gameStore";
import { useEffect, useRef, useCallback, useState } from "react";
import { X, Moon, Sun, Info, ShieldCheck } from "lucide-react";

export default function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, darkMode, toggleDarkMode } =
    useGameStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isSettingsOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        return;
      }

      if (e.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [setSettingsOpen],
  );

  if (!isSettingsOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all scale-100 opacity-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2
            id="settings-title"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            Ajustes
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Cerrar ajustes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Appearance */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Apariencia
            </h3>
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-medium">
                {mounted && darkMode ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
                Tema Oscuro
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  mounted && darkMode
                    ? "bg-sky-500"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    mounted && darkMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </button>
          </section>

          {/* How to Play */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" /> Cómo Jugar
            </h3>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                El objetivo es colocar exactamente <strong>una reina</strong> en
                cada:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Fila</li>
                <li>Columna</li>
                <li>Región de color</li>
              </ul>
              <p className="font-medium text-rose-500 dark:text-rose-400 mt-2">
                Regla de oro: ¡Las reinas no pueden tocarse entre sí, ni
                siquiera en diagonal!
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Sistema de Puntaje
                </h4>
                <ul className="space-y-2">
                  <li>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      +500 pts
                    </span>{" "}
                    por reina correcta.
                  </li>
                  <li>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Bono de velocidad
                    </span>{" "}
                    por colocar reinas rápido.
                  </li>
                  <li>
                    <span className="text-amber-500 font-medium">
                      Multiplicador de Combo
                    </span>{" "}
                    (hasta x5) por aciertos consecutivos rápidos.
                  </li>
                  <li>
                    <span className="text-rose-500 font-medium">-200 pts</span>{" "}
                    por colocar una reina incorrecta.
                  </li>
                  <li>
                    <span className="text-orange-500 font-medium">-50 pts</span>{" "}
                    por colocar una 'X' incorrecta.
                  </li>
                  <li>
                    <span className="text-slate-500 font-medium">-5 pts</span>{" "}
                    por cada segundo que pasa.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Créditos y Licencias
            </h3>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="mb-3">
                Los iconos utilizados en este proyecto fueron creados por
                talentosos diseñadores en Flaticon:
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/dinosaur"
                    title="dinosaur icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dinosaur icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/dog"
                    title="dog icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dog icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/cow"
                    title="cow icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cow icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/potato"
                    title="potato icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Potato icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/star-wars"
                    title="star wars icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Star wars icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/queen"
                    title="queen icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Queen icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/play-button"
                    title="play button icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Play button icons created by Freepik - Flaticon
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.flaticon.com/free-icons/trophy"
                    title="trophy icons"
                    className="text-sky-600 dark:text-sky-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Trophy icons created by Freepik - Flaticon
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
