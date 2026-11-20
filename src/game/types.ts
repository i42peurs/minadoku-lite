// ============================================================================
// TIPOS CENTRALES DE MINEDOKU
// Define todas las estructuras de datos del motor lógico, modos de juego,
// economía de fichas, Academia, Nivel Diario y persistencia en localStorage.
// ============================================================================

export type GridSize = 5 | 6 | 7 | 8;

export type GameMode = 'academy' | 'zen' | 'lives' | 'daily';

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

/**
 * Estados posibles de una casilla oculta:
 * - 'empty': sin marcar
 * - 'safe': marcada como segura (X)
 * - 'flag': marcada como mina (Bandera)
 * - 'question': marca visual de duda (?) que NO cuenta como mina para totales
 *   ni para victoria y NO penaliza vidas.
 */
export type CellMark = 'empty' | 'safe' | 'flag' | 'question';

/** Herramienta activa en la barra inferior cómoda para táctil y ratón */
export type InputTool = 'flag' | 'safe' | 'question' | 'scanner';

export type ThemeMode = 'light' | 'dark';

export interface CellCoord {
  r: number;
  c: number;
}

export interface PuzzleSpec {
  size: GridSize;
  rowClues: number[];
  colClues: number[];
  revealedHints: (number | null)[][];
}

export interface PuzzleBoard extends PuzzleSpec {
  id: string;
  solution: boolean[][]; // true = mina real, false = casilla segura
  totalMines: number;
  label?: string; // Etiqueta legible (ej. "Academia 1 · Regla del cero" o "Diario 2026-11-19")
}

/**
 * Resultado de una Pista Didáctica:
 * Señala la casilla objetivo, la acción lógica correcta, el patrón aplicado,
 * las casillas implicadas para colorear en el tablero y la explicación en español.
 */
export interface DidacticHint {
  row: number;
  col: number;
  action: 'safe' | 'flag';
  patternTitle: string;
  reason: string;
  relatedCells: CellCoord[];
  relatedRow?: number;
  relatedCol?: number;
  isCorrection?: boolean;
}

export interface BoardEvaluation {
  rowFlags: number[];
  colFlags: number[];
  rowSatisfied: boolean[];
  colSatisfied: boolean[];
  rowOver: boolean[];
  colOver: boolean[];
  hintSatisfied: boolean[][];
  hintOver: boolean[][];
  totalFlags: number;
  isSolved: boolean;
  allMinesFlaggedCleanly: boolean;
}

/** Lección de la Academia / Tutorial */
export interface AcademyLesson {
  id: string;
  index: number;
  title: string;
  patternTag: string;
  guided: boolean; // true = con guía paso a paso; false = práctica muy fácil sin guía
  introText: string;
  steps?: string[];
  puzzle: PuzzleBoard;
}

/** Reto local de recuperación de racha diaria (sin anuncios) */
export interface DailyRecoveryChallenge {
  missedDate: string; // Fecha YYYY-MM-DD que se perdió
  previousStreak: number; // Racha que se intenta rescatar
  remainingAttempts: number; // Intentos restantes (1, 3 o 5 según tramo)
  maxAttempts: number;
  tierLabel: string;
}

/** Estado de racha diaria guardado en localStorage */
export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
  completedDates: string[];
  recoveryChallengePending: DailyRecoveryChallenge | null;
}

/** Estado completo de progreso local guardado en localStorage */
export interface PlayerProgress {
  tokens: number; // Saldo de fichas para Pista Didáctica y Escáner
  scoreTotal: number;
  zenLevel: number; // Progresión de niveles en Modo Zen
  livesLevel: number; // Progresión de niveles en Modo Vidas
  livesStreak: number; // Racha paralela de niveles completados sin morir (NO recuperable)
  bestLivesStreak: number;
  completedAcademyIds: string[];
  daily: DailyStreakState;
  bestTimes: Record<string, number>;
  tokenRewardedDailyDates: string[];
}

export interface RunSummary {
  mode: GameMode;
  size: GridSize;
  puzzleLabel: string;
  elapsedSeconds: number;
  scoreEarned: number;
  tokensEarned: number;
  tokenReason: string;
  hintsUsed: number;
  scannersUsed: number;
  mistakes: number;
  livesRemaining: number;
  livesStreak: number;
  dailyStreak: number;
  recoveredDaily: boolean;
  shareText: string;
}
