import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { cellsBetween } from "@/domain/board";
import { playTap } from "@/lib/sound";
import { useGameStore } from "@/store/gameStore";

/** Below this, a finger rolling over a cell edge is still a tap. */
const DRAG_THRESHOLD_PX = 8;

interface Stroke {
  id: number;
  pointerId: number;
  startX: number;
  startY: number;
  /** Where the stroke last touched the grid, null while it is off the grid. */
  lastCell: number | null;
  dragging: boolean;
}

/**
 * Dragging across the grid marks the empty cells it crosses with an X.
 *
 * The cell comes from the pointer's position over the grid rather than from
 * the event target, because a touch stays captured by the cell it started on.
 * A press that never leaves its cell is left alone, so it reaches the cell as
 * an ordinary tap.
 */
export function useMarkStroke(gridSize: number) {
  const markCells = useGameStore((state) => state.markCells);
  const stroke = useRef<Stroke | null>(null);
  const swallowClick = useRef(false);

  const cellUnder = (event: PointerEvent<HTMLElement>): number | null => {
    const box = event.currentTarget.getBoundingClientRect();
    const col = Math.floor(((event.clientX - box.left) / box.width) * gridSize);
    const row = Math.floor(((event.clientY - box.top) / box.height) * gridSize);
    const onGrid = row >= 0 && row < gridSize && col >= 0 && col < gridSize;
    return onGrid ? row * gridSize + col : null;
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    swallowClick.current = false;
    if (!event.isPrimary || event.button !== 0) return;

    stroke.current = {
      id: event.timeStamp,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastCell: cellUnder(event),
      dragging: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const active = stroke.current;
    if (!active || event.pointerId !== active.pointerId) return;

    // A mouse released outside the grid never reports it here.
    if (event.buttons === 0) {
      stroke.current = null;
      return;
    }

    const cell = cellUnder(event);
    if (cell === null && !active.dragging) {
      stroke.current = null;
      return;
    }
    if (cell === active.lastCell) return;

    if (!active.dragging) {
      const moved = Math.hypot(
        event.clientX - active.startX,
        event.clientY - active.startY,
      );
      if (moved < DRAG_THRESHOLD_PX) return;

      active.dragging = true;
      swallowClick.current = true;
      // Only now: capturing on press would take the click from a plain tap.
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    // Leaving the grid breaks the line, so coming back cannot mark a chord
    // across cells the pointer never crossed.
    const path =
      cell === null
        ? []
        : active.lastCell === null
          ? [cell]
          : cellsBetween(active.lastCell, cell, gridSize);
    active.lastCell = cell;

    if (markCells(path, active.id)) playTap();
  };

  // A press that slides off the grid before dragging is not a stroke. A mouse
  // reports that here, as it is not captured yet; a touch reports it as a move.
  const onPointerLeave = () => {
    if (!stroke.current?.dragging) stroke.current = null;
  };

  const onStrokeEnd = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerId === stroke.current?.pointerId) stroke.current = null;
  };

  // Not every browser retargets the click that ends a drag, and one landing on
  // a cell would step it on to a queen. A detail of 0 is a click no pointer
  // made, such as one from assistive technology, and is always meant.
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!swallowClick.current || event.detail === 0) return;
    swallowClick.current = false;
    event.stopPropagation();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerLeave,
    onPointerUp: onStrokeEnd,
    onPointerCancel: onStrokeEnd,
    onClickCapture,
  };
}
