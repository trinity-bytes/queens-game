import { useGameStore } from "@/store/gameStore";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, Play, AlertCircle, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function VictoryModal() {
  const { status, timer, mistakes, theme, generatePuzzle } = useGameStore();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const score = Math.max(0, 10000 - Math.floor(timer / 10) - mistakes * 500);

  useEffect(() => {
    if (status === "won") {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6"],
      });
    }
  }, [status]);

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
    if (!name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("leaderboard").insert([
        {
          player_name: name.trim(),
          time_ms: timer,
          grid_size: 8,
          theme_used: theme,
          mistakes: mistakes,
          score: score,
        },
      ]);

      if (error) throw error;
      setSaved(true);
    } catch (error) {
      console.error("Error saving score:", error);
      alert("Hubo un error al guardar tu récord. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-sky-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Victoria!</h2>
          <p className="text-slate-600 font-medium">{getMessage()}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 mb-1 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" /> Errores
            </p>
            <p className="text-2xl font-bold text-rose-500">{mistakes}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 mb-1 flex items-center justify-center gap-1">
              <Star className="w-4 h-4" /> Puntaje
            </p>
            <p className="text-2xl font-bold text-amber-500">{score}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-slate-500 mb-1">Tu tiempo</p>
          <p className="text-3xl font-mono font-bold text-sky-600">
            {formatTime(timer)}
          </p>
        </div>

        {!saved ? (
          <form onSubmit={handleSave} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Guarda tu récord
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre o apodo"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                maxLength={15}
                required
              />
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center mb-6 font-medium">
            ¡Récord guardado!
          </div>
        )}

        <button
          onClick={() => {
            setSaved(false);
            setName("");
            generatePuzzle();
          }}
          className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
        >
          <Play size={20} />
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
