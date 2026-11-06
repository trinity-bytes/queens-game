import { useRef } from "react";
import { Eraser, Shuffle, Undo2, type LucideIcon } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { t, type Locale } from "@/lib/i18n";
import { playButton } from "@/lib/sound";

interface DockButtonProps {
  icon: LucideIcon;
  label: string;
  disabled: boolean;
  onClick: () => void;
}

function DockButton({ icon: Icon, label, disabled, onClick }: DockButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        playButton();
        onClick();
      }}
      className="flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl bg-icon-bg text-ink text-xs font-extrabold hover:brightness-95 disabled:opacity-50 disabled:hover:brightness-100 transition-all active:scale-95 disabled:active:scale-100"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="truncate max-w-full px-1">{label}</span>
    </button>
  );
}

function describeLoss(locale: Locale, queens: number, marks: number): string {
  const count = (key: string, value: number) =>
    t(locale, `game.lose.${key}.${value === 1 ? "one" : "other"}`, {
      count: value,
    });

  if (queens > 0 && marks > 0) {
    return t(locale, "game.lose.both", {
      queens: count("queens", queens),
      marks: count("marks", marks),
    });
  }
  return t(locale, "game.lose.single", {
    what: queens > 0 ? count("queens", queens) : count("marks", marks),
  });
}

/** Game actions, in the thumb zone on a phone. */
export default function GameDock() {
  const locale = useGameStore((state) => state.locale);
  const status = useGameStore((state) => state.status);
  const cells = useGameStore((state) => state.cells);
  const canUndo = useGameStore((state) => state.history.length > 0);
  const undo = useGameStore((state) => state.undo);
  const clearBoard = useGameStore((state) => state.clearBoard);
  const generatePuzzle = useGameStore((state) => state.generatePuzzle);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const playing = status === "playing";
  const queens = cells.filter((cell) => cell === 2).length;
  const marks = cells.filter((cell) => cell === 1).length;
  const hasMoves = queens + marks > 0;

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const confirmed = dialog.returnValue === "new";
    dialog.returnValue = "";
    if (confirmed) generatePuzzle();
  };

  return (
    <>
      <div className="game-dock flex gap-1.5 p-1.5 bg-card rounded-3xl shadow-[0_6px_18px_rgba(18,58,94,0.10)]">
        <DockButton
          icon={Undo2}
          label={t(locale, "game.undo")}
          disabled={!playing || !canUndo}
          onClick={undo}
        />
        <DockButton
          icon={Eraser}
          label={t(locale, "game.clear")}
          disabled={!playing || !hasMoves}
          onClick={clearBoard}
        />
        <DockButton
          icon={Shuffle}
          label={t(locale, "game.new")}
          disabled={!playing}
          onClick={() =>
            hasMoves ? dialogRef.current?.showModal() : generatePuzzle()
          }
        />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="new-puzzle-title"
        onClose={handleClose}
        className="sheet-dialog bg-card text-ink rounded-3xl p-4 shadow-[0_24px_40px_rgba(0,0,0,0.25)]"
        {...{ closedby: "any" }}
      >
        <h2
          id="new-puzzle-title"
          className="font-display text-xl font-extrabold text-ink"
        >
          {t(locale, "game.newTitle")}
        </h2>
        <p className="text-muted text-sm mt-1.5 mb-4">
          {describeLoss(locale, queens, marks)}
        </p>
        <form method="dialog" className="flex flex-col gap-2">
          <button
            value="keep"
            autoFocus
            className="min-h-11 rounded-2xl bg-ink text-card text-sm font-extrabold hover:brightness-110 transition-all active:scale-[0.97]"
          >
            {t(locale, "game.keepPlaying")}
          </button>
          <button
            value="new"
            className="min-h-11 rounded-2xl bg-icon-bg text-ink text-sm font-extrabold hover:brightness-95 transition-all active:scale-[0.97]"
          >
            {t(locale, "header.newPuzzle")}
          </button>
        </form>
      </dialog>
    </>
  );
}
