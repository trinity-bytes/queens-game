import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, User } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  player_name: string;
  time_ms: number;
  grid_size: number;
  theme_used: string;
  mistakes: number;
  score: number;
  moves_count?: number;
  created_at: string;
}

interface LeaderboardProps {
  fullPage?: boolean;
}

export default function Leaderboard({ fullPage = false }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = fullPage ? 50 : 10;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from("leaderboard")
          .select("*")
          .eq("grid_size", 9)
          .order("score", { ascending: false })
          .order("time_ms", { ascending: true })
          .limit(limit);

        if (error) throw error;
        setEntries(data || []);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Subscribe to changes
    const channel = supabase
      .channel("public:leaderboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leaderboard" },
        (payload) => {
          setEntries((current) => {
            const newEntries = [...current, payload.new as LeaderboardEntry];
            return newEntries
              .sort((a, b) => {
                if (b.score !== a.score) {
                  return b.score - a.score;
                }
                return a.time_ms - b.time_ms;
              })
              .slice(0, limit);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div
        className={`w-full ${fullPage ? "max-w-lg" : "max-w-md"} bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 ${fullPage ? "" : "mt-6"}`}
        role="status"
        aria-busy="true"
        aria-label="Cargando tabla de clasificación"
      >
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <span className="sr-only">Cargando mejores tiempos…</span>
      </div>
    );
  }

  const getRankStyle = (index: number) => {
    if (index === 0)
      return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 border-2 border-amber-400"; // Oro
    if (index === 1)
      return "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 border-2 border-slate-400"; // Plata
    if (index === 2)
      return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-400 border-2 border-orange-400"; // Bronce
    if (index < 10)
      return "bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-400"; // Top 10
    return "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"; // Resto
  };

  const getRankLabel = (index: number) => {
    if (index === 0) return "Rango Oro";
    if (index === 1) return "Rango Plata";
    if (index === 2) return "Rango Bronce";
    if (index < 10) return "Top 10";
    return `Posición ${index + 1}`;
  };

  return (
    <section
      className={`w-full ${fullPage ? "max-w-2xl" : "max-w-md"} bg-theme-surface rounded-xl shadow-sm p-6 ${fullPage ? "" : "mt-6"}`}
      aria-label="Tabla de clasificación"
    >
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <img
          src="/assets/icons/trophy.png"
          alt="Trophy"
          className="w-6 h-6 object-contain"
        />
        <h2 className="text-xl font-bold text-theme-text">Mejores Tiempos</h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-center py-4">
          Aún no hay récords. ¡Sé el primero!
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 gap-1.5 sm:gap-0 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(index)}`}
                  aria-label={getRankLabel(index)}
                  title={getRankLabel(index)}
                >
                  {index + 1}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <User
                    className="w-4 h-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[180px]">
                    {entry.player_name}
                  </span>
                  {entry.mistakes === 0 && (
                    <span
                      className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                      title="¡Completado sin errores!"
                    >
                      Flawless
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 pl-11 sm:pl-0 self-start sm:self-auto">
                {entry.moves_count !== undefined && (
                  <div
                    className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-medium"
                    title="Movimientos totales"
                  >
                    <span aria-label={`Movimientos: ${entry.moves_count}`}>
                      {entry.moves_count} movs
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 dark:bg-amber-400"
                    style={{
                      maskImage: "url(/assets/icons/star.svg)",
                      WebkitMaskImage: "url(/assets/icons/star.svg)",
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                    }}
                    aria-label="Star"
                  />
                  <span aria-label={`Puntaje: ${entry.score}`}>
                    {entry.score.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono font-semibold text-sm">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span aria-label={`Tiempo: ${formatTime(entry.time_ms)}`}>
                    {formatTime(entry.time_ms)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
