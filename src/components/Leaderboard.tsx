import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Clock, User } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  player_name: string;
  time_ms: number;
  grid_size: number;
  theme_used: string;
  created_at: string;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from("leaderboard")
          .select("*")
          .eq("grid_size", 8)
          .order("time_ms", { ascending: true })
          .limit(10);

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
              .sort((a, b) => a.time_ms - b.time_ms)
              .slice(0, 10);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 mt-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
        <Trophy className="text-amber-500 w-6 h-6" />
        <h2 className="text-xl font-bold text-slate-800">Mejores Tiempos</h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-slate-500 text-center py-4">
          Aún no hay récords. ¡Sé el primero!
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    index === 0
                      ? "bg-amber-100 text-amber-700"
                      : index === 1
                        ? "bg-slate-200 text-slate-700"
                        : index === 2
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-500"
                  }
                `}
                >
                  {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">
                    {entry.player_name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sky-600 font-mono font-semibold">
                <Clock className="w-4 h-4" />
                {formatTime(entry.time_ms)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
