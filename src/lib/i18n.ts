export type Locale = "en" | "es";

export const LOCALE_STORAGE_KEY = "queens-locale";

/**
 * The language the pages are prerendered in, and the one a player gets when
 * neither their choice nor their system names a supported language.
 */
export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: Locale[] = ["en", "es"];

type ThemeKey = "dino" | "dog" | "cow" | "potato" | "starwars" | "elephant";

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

const REGION_NAMES: Record<Locale, string[]> = {
  es: [
    "cielo",
    "azul",
    "índigo",
    "cian",
    "verde azulado",
    "esmeralda",
    "verde",
    "lima",
    "amarillo",
    "ámbar",
    "naranja",
    "rojo",
    "rosa",
    "violeta",
    "fucsia",
  ],
  en: [
    "sky",
    "blue",
    "indigo",
    "cyan",
    "teal",
    "emerald",
    "green",
    "lime",
    "yellow",
    "amber",
    "orange",
    "red",
    "rose",
    "violet",
    "fuchsia",
  ],
};

const VICTORY_MESSAGES: Record<Locale, Record<ThemeKey, string[]>> = {
  es: {
    dino: [
      "¡Eres un T-Rex de los puzzles!",
      "¡Rugiste fuerte, reina jurásica!",
      "¡Extinción evitada con pura estrategia!",
      "¡Pisaste fuerte cada región!",
      "¡Dominaste el tablero era prehistórica!",
    ],
    dog: [
      "¡Guau! ¡Qué partida tan fina!",
      "¡Patita arriba para esa jugada!",
      "¡Perfección canina desbloqueada!",
      "¡Buen chico/chica del tablero!",
      "¡Colmillo estratégico al máximo!",
    ],
    cow: [
      "¡Muuuuy bien hecho!",
      "¡Le sacaste leche a cada movimiento!",
      "¡Partida premium de granja!",
      "¡Qué rebaño de buenas decisiones!",
      "¡La vaca táctica aprueba esta victoria!",
    ],
    potato: [
      "¡Te ganaste un puré de papa!",
      "¡Papa suprema del tablero!",
      "¡Crujiste este puzzle como papita!",
      "¡Hoy toca banquete de papas!",
      "¡Nivel ñoqui real desbloqueado!",
    ],
    starwars: [
      "¡La fuerza es intensa en ti, mi reina!",
      "¡El consejo jedi aprueba este mate!",
      "¡Equilibraste la galaxia del tablero!",
      "¡Puro lado luminoso en cada reina!",
      "¡Hipersalto directo a la victoria!",
    ],
    elephant: [
      "¡Victoria de tamaño elefante!",
      "¡Aplastaste a la competencia!",
      "¡Una memoria de elefante para los buenos movimientos!",
      "¡Estrategia inolvidable!",
      "¡Pisaste fuerte en el tablero!",
    ],
  },
  en: {
    dino: [
      "You are a puzzle T-Rex!",
      "Jurassic queen energy unlocked!",
      "You stomped every region perfectly!",
      "Extinction-level strategy achieved!",
      "Prehistoric domination complete!",
    ],
    dog: [
      "Woof! That was a top-tier run!",
      "Paw-fect moves all around!",
      "Good human of the board!",
      "Canine precision unlocked!",
      "Tail-wagging victory secured!",
    ],
    cow: [
      "Moo-velous performance!",
      "Farm-grade strategy right there!",
      "You milked every point!",
      "Herd-approved decision making!",
      "Legendary pasture victory!",
    ],
    potato: [
      "You earned a mashed potato trophy!",
      "Supreme potato gamer detected!",
      "You crisped this puzzle!",
      "Fries-level greatness achieved!",
      "Starchy masterclass complete!",
    ],
    starwars: [
      "The Force is strong with you!",
      "Jedi council approved this win!",
      "You balanced the board galaxy!",
      "Pure light-side precision!",
      "Hyperdrive straight to victory!",
    ],
    elephant: [
      "Elephant-sized victory!",
      "You trampled the competition!",
      "A trunk full of right moves!",
      "Unforgettable strategy!",
      "You stomped the board!",
    ],
  },
};

const MESSAGES: Record<Locale, Record<string, string>> = {
  es: {
    "app.description":
      "Coloca una reina por fila, columna y región sin que se toquen. Un puzzle de lógica para jugar gratis en el navegador, con tabla de líderes.",
    "menu.open": "Abrir menú",
    "menu.close": "Cerrar menú",
    "menu.howToPlay": "Cómo Jugar",
    "menu.credits": "Créditos",
    "menu.language": "Idioma",
    "menu.sound": "Sonido",
    "menu.soundOn": "Activado",
    "menu.soundOff": "Desactivado",
    "header.timer": "Tiempo transcurrido: {time}",
    "header.light": "Cambiar a modo claro",
    "header.dark": "Cambiar a modo oscuro",
    "header.lightTitle": "Modo Claro",
    "header.darkTitle": "Modo Oscuro",
    "header.newPuzzle": "Nuevo puzzle",
    "header.timeLabel": "TIEMPO",
    "header.scoreLabel": "PUNTOS",
    "header.scoreAria": "Puntos: {value}",
    "header.comboAria": "Combo por {combo}",
    "home.viewLeaderboard": "Ver Tabla de Líderes",
    "board.generatingLabel": "Generando puzzle",
    "board.generatingText": "Generando puzzle único...",
    "board.gridAria": "Tablero de juego de {size} por {size}",
    "board.errorTitle": "No pudimos crear el puzzle",
    "board.errorText":
      "El generador agotó sus intentos sin encontrar un puzzle válido. Intenta de nuevo.",
    "board.errorRetry": "Reintentar",
    "msg.tip": "Toca una casilla: ✕ → reina → vacía",
    "victory.title": "¡Victoria!",
    "victory.totalAria": "Puntaje final: {value}",
    "victory.flawless": "¡Sin errores!",
    "victory.difficulty": "Dificultad",
    "victory.difficultyAria":
      "Dificultad del puzzle: {band}, multiplicador {multiplier}",
    "difficulty.gentle": "Suave",
    "difficulty.tricky": "Enredada",
    "difficulty.brutal": "Brutal",
    "victory.errorsBadge": "{count} errores",
    "victory.namePlaceholder": "Tu nombre o apodo",
    "victory.save": "Publicar",
    "victory.saving": "Publicando...",
    "victory.saved": "Publicado como {name}",
    "victory.playAgain": "Jugar de nuevo",
    "leaderboard.loading": "Cargando tabla de clasificación",
    "leaderboard.loadingBest": "Cargando mejores puntajes…",
    "leaderboard.section": "Tabla de clasificación",
    "leaderboard.title": "Mejores Puntajes",
    "leaderboard.empty": "El podio espera a su primera reina. ¿Serás tú?",
    "leaderboard.emptyTitle": "Aún no hay puntajes",
    "leaderboard.playCta": "Jugar ahora",
    "leaderboard.rankGold": "Rango Oro",
    "leaderboard.rankSilver": "Rango Plata",
    "leaderboard.rankBronze": "Rango Bronce",
    "leaderboard.top10": "Top 10",
    "leaderboard.position": "Posición {position}",
    "leaderboard.flawlessTitle": "¡Completado sin errores!",
    "leaderboard.movesTitle": "Movimientos totales",
    "leaderboard.movesAria": "Movimientos: {moves}",
    "leaderboard.movesShort": "movs",
    "leaderboard.scoreAria": "Puntaje: {score}",
    "leaderboard.timeAria": "Tiempo: {time}",
    "leaderboardPage.back": "Volver al juego",
    "leaderboardPage.title": "Tabla de Líderes",
    "tutorial.title": "Cómo Jugar",
    "tutorial.back": "Volver al juego",
    "tutorial.objective": "El Objetivo",
    "tutorial.objectiveText":
      "El objetivo del juego es colocar exactamente una reina en cada:",
    "tutorial.row": "Fila",
    "tutorial.column": "Columna",
    "tutorial.region": "Región de color",
    "tutorial.goldRule": "Regla de Oro",
    "tutorial.goldRuleText":
      "¡Las reinas no pueden tocarse entre sí, ni siquiera en diagonal!",
    "tutorial.scoring": "Más difícil, más puntos",
    "tutorial.cta": "¡Entendido, a jugar!",
    "credits.title": "Créditos y Licencias",
    "credits.back": "Volver al juego",
    "credits.designedBy": "Diseñado y desarrollado por",
    "credits.intro":
      "Los iconos utilizados en este proyecto fueron creados por talentosos diseñadores en Flaticon:",
    "credits.dino": "Iconos de dinosaurio creados por Freepik - Flaticon",
    "credits.dog": "Iconos de perro creados por Freepik - Flaticon",
    "credits.cow": "Iconos de vaca creados por Freepik - Flaticon",
    "credits.potato": "Iconos de patata creados por Freepik - Flaticon",
    "credits.starwars": "Iconos de Star Wars creados por Freepik - Flaticon",
    "credits.elephant": "Iconos de elefantes creados por Freepik - Flaticon",
    "credits.queen": "Iconos de reina creados por Freepik - Flaticon",
    "credits.cta": "Volver al Juego",
    "loading.text": "Preparando tu tablero...",
    "loading.subtitle": "Buscando un acomodo digno de una reina 👑",
    "skip.content": "Saltar al contenido",
    "announcer.mistake": "Error número {count}. Reina en posición incorrecta.",
    "announcer.xPenalty":
      "Penalización por mantener una X demasiado tiempo. Total: {count}.",
    "announcer.generating": "Generando nuevo puzzle. Por favor espera.",
    "announcer.ready":
      "Puzzle listo. Coloca una reina por fila, columna y región sin que se toquen entre sí.",
    "announcer.won": "¡Victoria! Has completado el puzzle correctamente.",
    "announcer.error":
      "No se pudo generar el puzzle. Usa el botón de reintentar.",
    "cell.stateQueen": "con reina",
    "cell.stateX": "marcada con X",
    "cell.stateEmpty": "vacía",
    "cell.aria": "Fila {row}, Columna {col}, región {region}, {state}",
    "victory.publishError": "No pudimos publicarlo. Tu puntaje sigue aquí.",
    "victory.retry": "Reintentar",
    "msg.conflict.touch": "Estas reinas se tocan: muévelas",
    "msg.conflict.row": "Estas reinas comparten fila: muévelas",
    "msg.conflict.column": "Estas reinas comparten columna: muévelas",
    "msg.conflict.region": "Estas reinas comparten región: muévelas",
    "game.undo": "Deshacer",
    "game.clear": "Limpiar",
    "game.new": "Nuevo",
    "game.queensPlaced": "{count} de {total} reinas",
    "game.newTitle": "¿Empezar otro puzzle?",
    "game.keepPlaying": "Seguir jugando",
    "game.lose.both": "Vas a perder {queens} y {marks} de este tablero.",
    "game.lose.single": "Vas a perder {what} de este tablero.",
    "game.lose.queens.one": "la reina",
    "game.lose.queens.other": "las {count} reinas",
    "game.lose.marks.one": "la marca",
    "game.lose.marks.other": "las {count} marcas",
    "firstRun.queen.title": "Esta es tu reina",
    "firstRun.queen.body":
      "Coloca una en cada fila, en cada columna y en cada color.",
    "firstRun.queen.cta": "Siguiente",
    "firstRun.mark.title": "Toca para marcar",
    "firstRun.mark.body":
      "Un toque pone ✕, el segundo coloca la reina y el tercero vacía la casilla.",
    "firstRun.mark.cta": "Toca la casilla",
    "firstRun.touch.title": "Las reinas no se tocan",
    "firstRun.touch.body":
      "Ni siquiera en diagonal: todo lo que rodea a una reina queda descartado.",
    "firstRun.touch.cta": "¡A jugar!",
    "firstRun.skip": "Saltar",
    "firstRun.stepAria": "Paso {step} de {total}",
    "firstRun.practiceAria": "Casilla de práctica",
    "victory.viewRanking": "Ver ranking",
    "victory.publishNote": "Solo se publica si tocas Publicar.",
    "victory.moves": "{moves} movimientos",
    "victory.errorsBadge.one": "1 error",
    "victory.breakdown": "{value} del tablero, −{percent} % por {errors}",
    "tutorial.cycleTitle": "Toca para cambiar la casilla",
    "tutorial.markFree": "Marcar con ✕ es gratis: úsalo para descartar.",
    "tutorial.scoreNote":
      "Cada reina mal colocada resta 8 %. El tiempo no resta puntos.",
    "leaderboard.errorTitle": "No pudimos cargar el ranking",
    "leaderboard.errorText":
      "Los puntajes siguen a salvo. Revisa tu conexión e inténtalo otra vez.",
  },
  en: {
    "app.description":
      "Place one queen per row, column and region without them touching. A free logic puzzle to play in your browser, with a leaderboard.",
    "menu.open": "Open menu",
    "menu.close": "Close menu",
    "menu.howToPlay": "How to Play",
    "menu.credits": "Credits",
    "menu.language": "Language",
    "menu.sound": "Sound",
    "menu.soundOn": "On",
    "menu.soundOff": "Off",
    "header.timer": "Elapsed time: {time}",
    "header.light": "Switch to light mode",
    "header.dark": "Switch to dark mode",
    "header.lightTitle": "Light Mode",
    "header.darkTitle": "Dark Mode",
    "header.newPuzzle": "New puzzle",
    "header.timeLabel": "TIME",
    "header.scoreLabel": "POINTS",
    "header.scoreAria": "Points: {value}",
    "header.comboAria": "Combo times {combo}",
    "home.viewLeaderboard": "View Leaderboard",
    "board.generatingLabel": "Generating puzzle",
    "board.generatingText": "Generating unique puzzle...",
    "board.gridAria": "Game board {size} by {size}",
    "board.errorTitle": "We couldn't create the puzzle",
    "board.errorText":
      "The generator ran out of attempts before finding a valid puzzle. Try again.",
    "board.errorRetry": "Try again",
    "msg.tip": "Tap a cell: ✕ → queen → empty",
    "victory.title": "Victory!",
    "victory.totalAria": "Final score: {value}",
    "victory.flawless": "Flawless!",
    "victory.difficulty": "Difficulty",
    "victory.difficultyAria":
      "Puzzle difficulty: {band}, multiplier {multiplier}",
    "difficulty.gentle": "Gentle",
    "difficulty.tricky": "Tricky",
    "difficulty.brutal": "Brutal",
    "victory.errorsBadge": "{count} mistakes",
    "victory.namePlaceholder": "Your name or nickname",
    "victory.save": "Publish",
    "victory.saving": "Publishing...",
    "victory.saved": "Published as {name}",
    "victory.playAgain": "Play again",
    "leaderboard.loading": "Loading leaderboard",
    "leaderboard.loadingBest": "Loading best scores…",
    "leaderboard.section": "Leaderboard",
    "leaderboard.title": "Best Scores",
    "leaderboard.empty": "The podium awaits its first queen. Will it be you?",
    "leaderboard.emptyTitle": "No scores yet",
    "leaderboard.playCta": "Play now",
    "leaderboard.rankGold": "Gold rank",
    "leaderboard.rankSilver": "Silver rank",
    "leaderboard.rankBronze": "Bronze rank",
    "leaderboard.top10": "Top 10",
    "leaderboard.position": "Position {position}",
    "leaderboard.flawlessTitle": "Completed with no mistakes!",
    "leaderboard.movesTitle": "Total moves",
    "leaderboard.movesAria": "Moves: {moves}",
    "leaderboard.movesShort": "moves",
    "leaderboard.scoreAria": "Score: {score}",
    "leaderboard.timeAria": "Time: {time}",
    "leaderboardPage.back": "Back to game",
    "leaderboardPage.title": "Leaderboard",
    "tutorial.title": "How to Play",
    "tutorial.back": "Back to game",
    "tutorial.objective": "Objective",
    "tutorial.objectiveText": "The goal is to place exactly one queen in each:",
    "tutorial.row": "Row",
    "tutorial.column": "Column",
    "tutorial.region": "Colored region",
    "tutorial.goldRule": "Golden Rule",
    "tutorial.goldRuleText":
      "Queens cannot touch each other, not even diagonally!",
    "tutorial.scoring": "Harder boards pay more",
    "tutorial.cta": "Got it, let's play!",
    "credits.title": "Credits & Licenses",
    "credits.back": "Back to game",
    "credits.designedBy": "Designed and developed by",
    "credits.intro":
      "The icons used in this project were created by talented designers on Flaticon:",
    "credits.dino": "Dinosaur icons created by Freepik - Flaticon",
    "credits.dog": "Dog icons created by Freepik - Flaticon",
    "credits.cow": "Cow icons created by Freepik - Flaticon",
    "credits.potato": "Potato icons created by Freepik - Flaticon",
    "credits.starwars": "Star wars icons created by Freepik - Flaticon",
    "credits.elephant": "Elephant icons created by Freepik - Flaticon",
    "credits.queen": "Queen icons created by Freepik - Flaticon",
    "credits.cta": "Back to Game",
    "loading.text": "Preparing your board...",
    "loading.subtitle": "Finding a spot fit for a queen 👑",
    "skip.content": "Skip to content",
    "announcer.mistake": "Mistake number {count}. Queen in incorrect position.",
    "announcer.xPenalty": "Penalty for keeping an X too long. Total: {count}.",
    "announcer.generating": "Generating a new puzzle. Please wait.",
    "announcer.ready":
      "Puzzle ready. Place one queen per row, column, and region without touching each other.",
    "announcer.won": "Victory! You completed the puzzle correctly.",
    "announcer.error":
      "Puzzle generation failed. Use the try again button.",
    "cell.stateQueen": "with queen",
    "cell.stateX": "marked with X",
    "cell.stateEmpty": "empty",
    "cell.aria": "Row {row}, Column {col}, region {region}, {state}",
    "victory.publishError": "We couldn't publish it. Your score is still here.",
    "victory.retry": "Retry",
    "msg.conflict.touch": "These queens touch: move them",
    "msg.conflict.row": "These queens share a row: move them",
    "msg.conflict.column": "These queens share a column: move them",
    "msg.conflict.region": "These queens share a region: move them",
    "game.undo": "Undo",
    "game.clear": "Clear",
    "game.new": "New",
    "game.queensPlaced": "{count} of {total} queens",
    "game.newTitle": "Start another puzzle?",
    "game.keepPlaying": "Keep playing",
    "game.lose.both": "You will lose {queens} and {marks} on this board.",
    "game.lose.single": "You will lose {what} on this board.",
    "game.lose.queens.one": "the queen",
    "game.lose.queens.other": "the {count} queens",
    "game.lose.marks.one": "the mark",
    "game.lose.marks.other": "the {count} marks",
    "firstRun.queen.title": "This is your queen",
    "firstRun.queen.body":
      "Place one in every row, every column and every colour.",
    "firstRun.queen.cta": "Next",
    "firstRun.mark.title": "Tap to mark",
    "firstRun.mark.body":
      "One tap adds ✕, the second places the queen and the third empties the cell.",
    "firstRun.mark.cta": "Tap the cell",
    "firstRun.touch.title": "Queens never touch",
    "firstRun.touch.body":
      "Not even diagonally: everything around a queen is ruled out.",
    "firstRun.touch.cta": "Let's play!",
    "firstRun.skip": "Skip",
    "firstRun.stepAria": "Step {step} of {total}",
    "firstRun.practiceAria": "Practice cell",
    "victory.viewRanking": "View ranking",
    "victory.publishNote": "It is only published if you tap Publish.",
    "victory.moves": "{moves} moves",
    "victory.errorsBadge.one": "1 mistake",
    "victory.breakdown": "{value} for the board, −{percent}% for {errors}",
    "tutorial.cycleTitle": "Tap to change the cell",
    "tutorial.markFree": "Marking with ✕ is free: use it to rule cells out.",
    "tutorial.scoreNote":
      "Each misplaced queen takes off 8%. Time costs no points.",
    "leaderboard.errorTitle": "We couldn't load the ranking",
    "leaderboard.errorText":
      "The scores are safe. Check your connection and try again.",
  },
};

export function normalizeLocale(
  value: string | null | undefined,
): Locale | null {
  if (!value) return null;
  const lowered = value.toLowerCase();

  if (lowered.startsWith("es")) return "es";
  if (lowered.startsWith("en")) return "en";

  return null;
}

export function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_LOCALE;
}

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function getInitialLocale(): Locale {
  const stored = getStoredLocale();
  if (stored) return stored;
  return detectBrowserLocale();
}

export function t(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return raw;

  return Object.entries(vars).reduce((acc, [name, value]) => {
    return acc.replaceAll(`{${name}}`, String(value));
  }, raw);
}

/** Sorted, so two locales can be compared for missing translations. */
export function messageKeys(locale: Locale): string[] {
  return Object.keys(MESSAGES[locale]).sort();
}

export function getLanguageLabel(locale: Locale): string {
  return LANGUAGE_LABELS[locale];
}

export function getLanguageOptions(): Array<{ value: Locale; label: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({
    value: locale,
    label: LANGUAGE_LABELS[locale],
  }));
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getVictoryMessage(
  locale: Locale,
  theme: ThemeKey,
  seed: string | null,
): string {
  const themeMessages =
    VICTORY_MESSAGES[locale]?.[theme] ?? VICTORY_MESSAGES[DEFAULT_LOCALE][theme];
  if (!themeMessages || themeMessages.length === 0) {
    return "Congratulations, my queen!";
  }

  const index = seed ? hashString(seed) % themeMessages.length : 0;
  return themeMessages[index];
}

export function getRegionName(locale: Locale, regionId: number): string {
  const names = REGION_NAMES[locale] ?? REGION_NAMES[DEFAULT_LOCALE];
  return names[regionId % names.length];
}
