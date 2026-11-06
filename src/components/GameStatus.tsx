import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

/** How far along the board is, and the way out to the leaderboard. */
export default function GameStatus() {
  const locale = useGameStore((state) => state.locale);
  const gridSize = useGameStore((state) => state.gridSize);
  const queens = useGameStore(
    (state) => state.cells.filter((cell) => cell === 2).length,
  );

  return (
    <div className="game-status">
      <span className="game-status__pill bg-card text-ink rounded-xl px-2.5 py-1 text-xs font-extrabold tabular-nums">
        {t(locale, "game.queensPlaced", { count: queens, total: gridSize })}
      </span>
      <Link
        href="/leaderboard"
        className="game-status__link text-ink text-xs font-bold py-2 hover:underline"
      >
        {t(locale, "home.viewLeaderboard")}
      </Link>
    </div>
  );
}
