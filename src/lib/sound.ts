/**
 * Tiny Web Audio layer for UI feedback.
 *
 * Every sound is synthesized on the fly, so the app ships no audio assets and
 * makes no network requests to play them.
 *
 * Sounds are intentionally not tied to whether a move is correct: the cell tap
 * sounds identical for every state change, so audio can never become an oracle
 * for the puzzle solution.
 */

type Tone = {
  /** Frequency in Hz. */
  freq: number;
  /** Seconds from the start of the sound until this tone plays. */
  offset: number;
  /** Duration in seconds. */
  duration: number;
  /** Peak gain, before the master gain. */
  peak: number;
  type: OscillatorType;
};

const MASTER_GAIN = 0.18;

const TAP: Tone[] = [
  { freq: 520, offset: 0, duration: 0.055, peak: 0.6, type: "sine" },
];

const BUTTON: Tone[] = [
  { freq: 760, offset: 0, duration: 0.04, peak: 0.45, type: "triangle" },
];

// C major arpeggio, the only "loud" moment in the game.
const VICTORY: Tone[] = [
  { freq: 523.25, offset: 0, duration: 0.16, peak: 0.5, type: "triangle" },
  { freq: 659.25, offset: 0.09, duration: 0.16, peak: 0.5, type: "triangle" },
  { freq: 783.99, offset: 0.18, duration: 0.16, peak: 0.5, type: "triangle" },
  { freq: 1046.5, offset: 0.27, duration: 0.32, peak: 0.55, type: "triangle" },
];

let context: AudioContext | null = null;
let enabled = false;

/**
 * Reflects the store's sound preference. Kept as a module-level flag so the
 * play helpers can stay plain functions callable from event handlers.
 */
export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }

  // Browsers start the context suspended until a user gesture. Every caller
  // here runs from a click or tap, so resuming is safe.
  if (context.state === "suspended") {
    void context.resume();
  }
  return context;
}

function play(tones: Tone[]): void {
  if (!enabled) return;

  const ctx = getContext();
  if (!ctx) return;

  const start = ctx.currentTime;
  for (const tone of tones) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.freq, start + tone.offset);

    // Fast attack, exponential decay: reads as a click rather than a beep.
    const peak = tone.peak * MASTER_GAIN;
    gain.gain.setValueAtTime(0.0001, start + tone.offset);
    gain.gain.exponentialRampToValueAtTime(peak, start + tone.offset + 0.008);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + tone.offset + tone.duration,
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start + tone.offset);
    oscillator.stop(start + tone.offset + tone.duration + 0.02);
  }
}

/** Board cell tap. Identical for empty, X and queen. */
export function playTap(): void {
  play(TAP);
}

/** Any other interactive control: menu, header actions, modal buttons. */
export function playButton(): void {
  play(BUTTON);
}

/** Puzzle solved. */
export function playVictory(): void {
  play(VICTORY);
}
