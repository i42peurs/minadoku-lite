// ============================================================================
// REGLAS DEL TABLERO, ECONOMÍA DE FICHAS, RACHA DIARIA Y TEXTO COMPARTIBLE
// ============================================================================

import type {
  BoardEvaluation,
  CellMark,
  DailyStreakState,
  GameMode,
  GridSize,
  PuzzleBoard,
  RunSummary,
} from './types';

/** Costes y saldo inicial de fichas */
export const HINT_COST_TOKENS = 1; // Pista didáctica
export const SCANNER_COST_TOKENS = 2; // Escáner / Revelar casilla elegida
export const INITIAL_TOKENS = 5; // Saldo inicial limitado

export function createEmptyMarks(size: number): CellMark[][] {
  return Array.from({ length: size }, () => Array<CellMark>(size).fill('empty'));
}

export function cloneMarks(marks: CellMark[][]): CellMark[][] {
  return marks.map((row) => row.slice());
}

/**
 * Evalúa el estado actual del tablero.
 * IMPORTANTE: Las marcas '?' ('question') NO cuentan como banderas ni como minas
 * para los totales de fila/columna, ni para vecindades, ni para ganar.
 */
export function evaluateBoard(puzzle: PuzzleBoard, marks: CellMark[][]): BoardEvaluation {
  const { size, rowClues, colClues, revealedHints, solution } = puzzle;

  const rowFlags = new Array<number>(size).fill(0);
  const colFlags = new Array<number>(size).fill(0);
  let totalFlags = 0;
  let allMinesFlaggedCleanly = true;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isFlag = marks[r][c] === 'flag';
      if (isFlag) {
        rowFlags[r]++;
        colFlags[c]++;
        totalFlags++;
      }
      if (solution[r][c] && !isFlag) allMinesFlaggedCleanly = false;
      if (!solution[r][c] && isFlag) allMinesFlaggedCleanly = false;
    }
  }

  const rowSatisfied = rowFlags.map((count, r) => count === rowClues[r]);
  const colSatisfied = colFlags.map((count, c) => count === colClues[c]);
  const rowOver = rowFlags.map((count, r) => count > rowClues[r]);
  const colOver = colFlags.map((count, c) => count > colClues[c]);

  const hintSatisfied: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false)
  );
  const hintOver: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false)
  );

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const target = revealedHints[r][c];
      if (target === null) continue;
      let neighborFlags = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && marks[nr][nc] === 'flag') {
            neighborFlags++;
          }
        }
      }
      hintSatisfied[r][c] = neighborFlags === target;
      hintOver[r][c] = neighborFlags > target;
    }
  }

  return {
    rowFlags,
    colFlags,
    rowSatisfied,
    colSatisfied,
    rowOver,
    colOver,
    hintSatisfied,
    hintOver,
    totalFlags,
    isSolved: allMinesFlaggedCleanly,
    allMinesFlaggedCleanly,
  };
}

/** Auto-completa con X las casillas seguras vacías o con '?' al ganar */
export function autoCompleteSafeMarks(puzzle: PuzzleBoard, marks: CellMark[][]): CellMark[][] {
  const next = cloneMarks(marks);
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (
        puzzle.revealedHints[r][c] === null &&
        !puzzle.solution[r][c] &&
        (next[r][c] === 'empty' || next[r][c] === 'question')
      ) {
        next[r][c] = 'safe';
      }
    }
  }
  return next;
}

export function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getSpeedTargetSeconds(size: GridSize): number {
  switch (size) {
    case 5:
      return 65;
    case 6:
      return 115;
    case 7:
      return 180;
    case 8:
      return 260;
  }
}

/**
 * Calcula puntuación ganada.
 * En Modo Vidas, la racha paralela de niveles sin morir (no recuperable)
 * aplica un multiplicador creciente (+15% por nivel consecutivo hasta x2.50).
 */
export function calculateScore(params: {
  mode: GameMode;
  size: GridSize;
  elapsedSeconds: number;
  hintsUsed: number;
  scannersUsed: number;
  mistakes: number;
  livesStreakAfterWin: number;
}): number {
  const baseBySize: Record<GridSize, number> = { 5: 100, 6: 180, 7: 280, 8: 420 };
  const base = baseBySize[params.size];
  const target = getSpeedTargetSeconds(params.size);
  const speedBonus = Math.max(0, Math.round(((target - params.elapsedSeconds) / target) * 80));
  const cleanBonus =
    params.mistakes === 0 && params.hintsUsed === 0 && params.scannersUsed === 0 ? 75 : 0;

  let raw = base + speedBonus + cleanBonus - params.hintsUsed * 20 - params.scannersUsed * 35;
  raw = Math.max(40, raw);

  if (params.mode === 'lives') {
    const streakMultiplier = 1 + Math.min(10, Math.max(0, params.livesStreakAfterWin - 1)) * 0.15;
    return Math.round(raw * streakMultiplier);
  }
  return raw;
}

/**
 * Economía de fichas anti-farmeo:
 * - Academia: +1 ficha solo la 1ª vez que completas cada lección.
 * - Diario: +2 fichas (+3 si es limpio sin ayudas ni errores), solo 1 vez por fecha.
 * - 5×5 Zen: 0 fichas (evita farmeo fácil sin riesgo).
 * - 5×5 Vidas: +1 ficha solo si es limpio y bajo tiempo objetivo.
 * - 6×6 / 7×7 / 8×8: recompensas crecientes por dificultad, limpieza y velocidad.
 */
export function calculateTokenReward(params: {
  mode: GameMode;
  size: GridSize;
  elapsedSeconds: number;
  hintsUsed: number;
  scannersUsed: number;
  mistakes: number;
  isFirstTimeAcademy?: boolean;
  isFirstTimeDaily?: boolean;
}): { tokens: number; reason: string } {
  const clean = params.hintsUsed === 0 && params.scannersUsed === 0 && params.mistakes === 0;
  const fast = params.elapsedSeconds <= getSpeedTargetSeconds(params.size);

  if (params.mode === 'academy') {
    if (params.isFirstTimeAcademy) {
      return { tokens: 1, reason: 'Primera vez completando la lección' };
    }
    return { tokens: 0, reason: 'Lección ya recompensada anteriormente' };
  }

  if (params.mode === 'daily') {
    if (params.isFirstTimeDaily) {
      return {
        tokens: clean ? 3 : 2,
        reason: clean ? 'Diario impecable sin errores ni ayudas' : 'Nivel diario completado',
      };
    }
    return { tokens: 0, reason: 'Recompensa del día ya cobrada' };
  }

  if (params.size === 5) {
    if (params.mode === 'lives' && clean && fast) {
      return { tokens: 1, reason: '5×5 en Modo Vidas limpio y rápido' };
    }
    return {
      tokens: 0,
      reason: 'Completa 6×6+ o logra 5×5 limpio y rápido en Vidas para ganar fichas',
    };
  }

  if (params.size === 6) {
    if (clean && fast) return { tokens: 2, reason: '6×6 impecable bajo tiempo objetivo' };
    if (clean || params.mode === 'lives') return { tokens: 1, reason: '6×6 superado con solidez' };
    return { tokens: 0, reason: 'Completa 6×6 sin ayudas para ganar fichas' };
  }

  if (params.size === 7) {
    if (clean && fast) return { tokens: 3, reason: '7×7 impecable y veloz' };
    if (clean) return { tokens: 2, reason: '7×7 resuelto sin ayudas' };
    return { tokens: 1, reason: 'Nivel difícil 7×7 superado' };
  }

  if (clean && fast) return { tokens: 4, reason: '8×8 maestro: limpio y bajo tiempo' };
  if (clean) return { tokens: 3, reason: '8×8 resuelto sin ayudas' };
  return { tokens: 2, reason: 'Nivel experto 8×8 superado' };
}

/** Diferencia en días enteros entre dos fechas YYYY-MM-DD (b - a) */
export function diffDays(dateA: string, dateB: string): number {
  const [ya, ma, da] = dateA.split('-').map(Number);
  const [yb, mb, db] = dateB.split('-').map(Number);
  const utcA = Date.UTC(ya, ma - 1, da);
  const utcB = Date.UTC(yb, mb - 1, db);
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * Oportunidades de recuperación de racha diaria sin anuncios (por reto in-game):
 * - Racha corta (1–4 días): 1 oportunidad
 * - Racha normalita (5–14 días): 3 oportunidades
 * - Racha muy buena (15+ días): 5 oportunidades
 */
export function getDailyRecoveryAllowance(streak: number): {
  attempts: number;
  tierLabel: string;
} {
  if (streak >= 15) {
    return { attempts: 5, tierLabel: 'Racha muy buena (5 oportunidades)' };
  }
  if (streak >= 5) {
    return { attempts: 3, tierLabel: 'Racha normal (3 oportunidades)' };
  }
  return { attempts: 1, tierLabel: 'Racha corta (1 oportunidad)' };
}

/**
 * Actualiza el estado de racha diaria al abrir el juego en la fecha `todayKey`.
 * Si falta exactamente 1 día (gap === 2), activa el reto de rescate sin anuncios.
 */
export function evaluateDailyStatusOnDate(
  daily: DailyStreakState,
  todayKey: string
): DailyStreakState {
  if (!daily.lastCompletedDate || daily.currentStreak <= 0) {
    return { ...daily, recoveryChallengePending: null };
  }

  const gap = diffDays(daily.lastCompletedDate, todayKey);
  if (gap <= 1) {
    return { ...daily, recoveryChallengePending: null };
  }

  if (gap === 2) {
    if (daily.recoveryChallengePending) return daily;

    const { attempts, tierLabel } = getDailyRecoveryAllowance(daily.currentStreak);
    const [yt, mt, dt] = todayKey.split('-').map(Number);
    const yesterday = new Date(Date.UTC(yt, mt - 1, dt - 1));
    const missedDate = `${yesterday.getUTCFullYear()}-${String(
      yesterday.getUTCMonth() + 1
    ).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;

    return {
      ...daily,
      recoveryChallengePending: {
        missedDate,
        previousStreak: daily.currentStreak,
        remainingAttempts: attempts,
        maxAttempts: attempts,
        tierLabel,
      },
    };
  }

  return {
    ...daily,
    currentStreak: 0,
    recoveryChallengePending: null,
  };
}

/** Construye texto listo para copiar con el botón "Compartir" */
export function buildShareText(
  summary: Omit<RunSummary, 'shareText'>,
  puzzle: PuzzleBoard
): string {
  const modeNames: Record<GameMode, string> = {
    academy: 'Academia',
    zen: 'Modo Zen',
    lives: 'Modo Vidas',
    daily: 'Nivel Diario',
  };

  const miniGrid = puzzle.solution
    .map((row, r) =>
      row
        .map((isMine, c) => {
          if (puzzle.revealedHints[r][c] !== null) return '🟦';
          return isMine ? '🚩' : '⬜';
        })
        .join('')
    )
    .join('\n');

  const lines = [
    `Minadoku Lite · ${summary.puzzleLabel} (${summary.size}×${summary.size})`,
    `Modo: ${modeNames[summary.mode]} · Tiempo: ${formatTime(summary.elapsedSeconds)}`,
    `Puntos: ${summary.scoreEarned} · Ayudas: ${summary.hintsUsed + summary.scannersUsed} · Errores: ${summary.mistakes}`,
  ];

  if (summary.mode === 'lives') {
    lines.push(
      `Racha sin morir: ${summary.livesStreak} · Vidas restantes: ${summary.livesRemaining}`
    );
  }
  if (summary.mode === 'daily') {
    lines.push(
      `Racha diaria: ${summary.dailyStreak} día${summary.dailyStreak === 1 ? '' : 's'}${
        summary.recoveredDaily ? ' (Rescatada)' : ''
      }`
    );
  }
  lines.push('', miniGrid);
  return lines.join('\n');
}
