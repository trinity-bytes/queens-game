import { useGameStore } from "@/store/gameStore";
import { useEffect, useState, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSavedNicks, saveNick } from "@/lib/nickStorage";
import Link from "next/link";

const RESET_HOME_ON_RETURN_KEY = "reset-home-on-return-from-leaderboard";

/**
 * Checks if user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function VictoryModal() {
  const {
    status,
    timer,
    mistakes,
    xPenalties,
    theme,
    generatePuzzle,
    score,
    grossScore,
    totalPenalties,
    movesCount,
    currentWinId,
    hasSavedCurrentWin,
    markCurrentWinSaved,
  } = useGameStore();
  const [name, setName] = useState(() => getSavedNicks()[0] ?? "");
  const [saving, setSaving] = useState(false);
  const nickSuggestions = getSavedNicks();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const saved = hasSavedCurrentWin();

  useEffect(() => {
    if (status === "won") {
      if (!prefersReducedMotion()) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6"],
        });
      }

      // Save previous focus and move focus into modal
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Defer to allow render
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    } else {
      // Return focus when modal closes
      previousFocusRef.current?.focus();
    }
  }, [status]);

  const handlePlayAgain = async () => {
    if (saving) return;

    if (!saved) {
      setSaving(true);
      const finalName = name.trim() || "Unknown";
      try {
        const { error } = await supabase.from("leaderboard").insert([
          {
            player_name: finalName,
            time_ms: timer,
            grid_size: 9,
            theme_used: theme,
            mistakes: mistakes,
            score: score,
            win_id: currentWinId,
            device_local_time: new Date().toISOString(),
            user_agent: navigator.userAgent,
            device_type: window.innerWidth < 768 ? "mobile" : "desktop",
            moves_count: movesCount,
            app_version: "1.1.0",
          },
        ]);

        if (error) throw error;
        markCurrentWinSaved();
        if (name.trim()) {
          saveNick(name.trim());
        }
      } catch (error) {
        console.error("Error auto-saving score:", error);
      } finally {
        setSaving(false);
      }
    }

    setName(getSavedNicks()[0] ?? "");
    generatePuzzle();
  };

  // Focus trap: keep Tab/Shift+Tab inside modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handlePlayAgain();
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
    [handlePlayAgain],
  );

  if (status !== "won") return null;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getMessage = () => {
    switch (theme) {
      case "dino":
        return "¡Eres un T-Rex de los puzzles!";
      case "dog":
        return "¡Guau! ¡Qué buen chico/a!";
      case "cow":
        return "¡Muuuuy bien hecho!";
      case "potato":
        return "¡Te ganaste un puré de papas!";
      case "starwars":
        return "¡La fuerza es intensa en ti, mi reina!";
      default:
        return "¡Felicidades, mi reina!";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || saved || !name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("leaderboard").insert([
        {
          player_name: name.trim(),
          time_ms: timer,
          grid_size: 9,
          theme_used: theme,
          mistakes: mistakes,
          score: score,
          win_id: currentWinId,
          device_local_time: new Date().toISOString(),
          user_agent: navigator.userAgent,
          device_type: window.innerWidth < 768 ? "mobile" : "desktop",
          moves_count: movesCount,
          app_version: "1.1.0",
        },
      ]);

      if (error) throw error;
      saveNick(name.trim());
      markCurrentWinSaved();
    } catch (error) {
      console.error("Error saving score:", error);
      alert("Hubo un error al guardar tu récord. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-theme-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <img
              src="/assets/icons/trophy.png"
              alt="Trophy"
              className="w-8 h-8 object-contain"
            />
          </div>
          <h2
            id="victory-title"
            className="text-2xl font-bold text-theme-text mb-2"
          >
            ¡Victoria!
          </h2>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            {getMessage()}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-center gap-1">
              <img
                src="/assets/icons/star.svg"
                alt="Star"
                className="w-4 h-4 object-contain"
              />{" "}
              Puntos
            </p>
            <p
              className="text-2xl font-bold text-green-500 dark:text-green-400"
              aria-label={`Puntos ganados: ${grossScore}`}
            >
              +{grossScore}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />{" "}
              Penalización
            </p>
            <p
              className="text-2xl font-bold text-rose-500 dark:text-rose-400"
              aria-label={`Penalizaciones totales: ${totalPenalties}`}
            >
              -{totalPenalties}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-center gap-1">
              <img
                src="/assets/icons/trophy.png"
                alt="Trophy"
                className="w-4 h-4 object-contain"
              />{" "}
              Total
            </p>
            <p
              className="text-2xl font-bold text-amber-500 dark:text-amber-400"
              aria-label={`Puntaje final: ${score}`}
            >
              {score}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-6 text-center relative">
          {mistakes === 0 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
              ¡Flawless!
            </div>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 mt-2">
            Tu tiempo
          </p>
          <p className="text-3xl font-mono font-bold text-theme-text">
            {formatTime(timer)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Completado en {movesCount} movimientos
          </p>
        </div>

        {!saved ? (
          <form onSubmit={handleSave} className="mb-6">
            <label
              htmlFor="player-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Guarda tu récord
            </label>
            <div className="flex gap-2">
              <input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre o apodo"
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
                maxLength={15}
                required
                list="nick-suggestions"
                autoComplete="off"
              />
              <datalist id="nick-suggestions">
                {nickSuggestions.map((nick) => (
                  <option key={nick} value={nick} />
                ))}
              </datalist>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-sky-600 dark:bg-sky-700 text-white rounded-lg font-medium hover:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6 space-y-3">
            <div
              className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-center font-medium"
              role="alert"
            >
              ¡Récord guardado!
            </div>
            <Link
              href="/leaderboard"
              onClick={() =>
                sessionStorage.setItem(RESET_HOME_ON_RETURN_KEY, "1")
              }
              className="w-full py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-700"
            >
              <img
                src="/assets/icons/trophy.png"
                alt="Trophy"
                className="w-5 h-5 object-contain"
              />
              Ver Tabla de Líderes
            </Link>
          </div>
        )}

        <button
          onClick={handlePlayAgain}
          className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
        >
          <img
            src="/assets/icons/play-button.png"
            alt="Play"
            className="w-5 h-5 object-contain invert"
          />
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
