"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";

/**
 * Invisible live region that announces game events to screen readers.
 */
export default function LiveAnnouncer() {
  const { status, mistakes, xPenalties } = useGameStore();
  const [message, setMessage] = useState("");
  const prevMistakes = useRef(mistakes);
  const prevXPenalties = useRef(xPenalties);
  const prevStatus = useRef(status);

  useEffect(() => {
    // Announce mistake
    if (mistakes > prevMistakes.current) {
      setMessage(`Error número ${mistakes}. Reina en posición incorrecta.`);
    }
    prevMistakes.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    // Announce X penalty
    if (xPenalties > prevXPenalties.current) {
      setMessage(
        `Penalización por mantener una X demasiado tiempo. Total: ${xPenalties}.`,
      );
    }
    prevXPenalties.current = xPenalties;
  }, [xPenalties]);

  useEffect(() => {
    if (status !== prevStatus.current) {
      switch (status) {
        case "generating":
          setMessage("Generando nuevo puzzle. Por favor espera.");
          break;
        case "playing":
          if (prevStatus.current === "generating") {
            setMessage(
              "Puzzle listo. Coloca una reina por fila, columna y región sin que se toquen entre sí.",
            );
          }
          break;
        case "won":
          setMessage("¡Victoria! Has completado el puzzle correctamente.");
          break;
      }
    }
    prevStatus.current = status;
  }, [status]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
