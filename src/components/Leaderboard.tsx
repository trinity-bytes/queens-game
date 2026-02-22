import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Clock, User, Star } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  player_name: string;
  time_ms: number;
  grid_size: number;
  theme_used: string;
  mistakes: number;
  score: number;
  created_at: string;
}

interface LeaderboardProps {
  fullPage?: boolean;
}

export default function Leaderboard({ fullPage = false }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = fullPage ? 25 : 10;

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

  return (
    <section
      className={`w-full ${fullPage ? "max-w-lg" : "max-w-md"} bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 ${fullPage ? "" : "mt-6"}`}
      aria-label="Tabla de clasificación"
    >
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <Trophy
          className="text-amber-500 dark:text-amber-400 w-6 h-6"
          aria-hidden="true"
        />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Mejores Tiempos
        </h2>
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
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    index === 0
                      ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400"
                      : index === 1
                        ? "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                        : index === 2
                          ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-400"
                          : "bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                  }
                `}
                >
                  {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {entry.player_name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                  <Star className="w-4 h-4" aria-hidden="true" />
                  <span aria-label={`Puntaje: ${entry.score}`}>
                    {entry.score}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-mono font-semibold text-sm">
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
