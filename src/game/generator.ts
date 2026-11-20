// ============================================================================
// GENERADOR PROCEDURAL CON SOLUCIÓN ÚNICA + GENERADOR DETERMINISTA DIARIO
// Admite valores 0 en totales exteriores (fila/columna) y en pistas interiores.
// ============================================================================

import { countSolutions } from './solver';
import type { GridSize, PuzzleBoard } from './types';

/** Generador pseudoaleatorio determinista (Mulberry32) a partir de semilla textual */
export function createSeededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function getMineRange(size: GridSize): [number, number] {
  switch (size) {
    case 5:
      return [7, 10];
    case 6:
      return [11, 14];
    case 7:
      return [15, 19];
    case 8:
      return [20, 25];
  }
}

function getMinRevealedHints(size: GridSize): number {
  switch (size) {
    case 5:
      return 4;
    case 6:
      return 6;
    case 7:
      return 8;
    case 8:
      return 10;
  }
}

export function computeNeighborMines(
  solution: boolean[][],
  r: number,
  c: number,
  size: number
): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && solution[nr][nc]) {
        count++;
      }
    }
  }
  return count;
}

export interface GenerateOptions {
  rng?: () => number;
  label?: string;
  idOverride?: string;
  allowZeroLines?: boolean;
}

/**
 * Genera un tablero N×N con solución única verificada por solver + backtracking.
 * Permite totales 0 en filas/columnas y casillas numéricas interiores con valor 0.
 */
export function generatePuzzle(
  size: GridSize,
  rngOrOptions: (() => number) | GenerateOptions = Math.random
): PuzzleBoard {
  const options: GenerateOptions =
    typeof rngOrOptions === 'function' ? { rng: rngOrOptions } : rngOrOptions;
  const rng = options.rng ?? Math.random;
  const allowZeroLines = options.allowZeroLines ?? true;

  const [minMines, maxMines] = getMineRange(size);
  const minHints = getMinRevealedHints(size);

  for (let attempt = 0; attempt < 28; attempt++) {
    const totalMines = minMines + Math.floor(rng() * (maxMines - minMines + 1));
    const allIndices = Array.from({ length: size * size }, (_, i) => i);
    const mineIndices = new Set(shuffle(allIndices, rng).slice(0, totalMines));

    // Ocasionalmente dejamos una fila o columna completa a 0 de forma natural
    if (allowZeroLines && attempt % 3 === 0 && rng() < 0.45) {
      const clearRow = rng() < 0.5;
      const lineIdx = Math.floor(rng() * size);
      for (let k = 0; k < size; k++) {
        const idx = clearRow ? lineIdx * size + k : k * size + lineIdx;
        mineIndices.delete(idx);
      }
      if (mineIndices.size < minMines - 2) {
        const candidates = shuffle(
          allIndices.filter((idx) => {
            const r = Math.floor(idx / size);
            const c = idx % size;
            return !mineIndices.has(idx) && (clearRow ? r !== lineIdx : c !== lineIdx);
          }),
          rng
        );
        for (let i = 0; i < candidates.length && mineIndices.size < minMines; i++) {
          mineIndices.add(candidates[i]);
        }
      }
    }

    const solution: boolean[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => mineIndices.has(r * size + c))
    );

    const rowClues = Array.from({ length: size }, (_, r) =>
      solution[r].reduce((acc, isMine) => acc + (isMine ? 1 : 0), 0)
    );
    const colClues = Array.from({ length: size }, (_, c) => {
      let sum = 0;
      for (let r = 0; r < size; r++) if (solution[r][c]) sum++;
      return sum;
    });

    // Evitamos exceso de líneas triviales en un mismo tablero manteniendo permitido el 0
    const zeroLineCount =
      rowClues.filter((v) => v === 0).length + colClues.filter((v) => v === 0).length;
    const fullLineCount =
      rowClues.filter((v) => v === size).length + colClues.filter((v) => v === size).length;
    if (attempt < 16 && (zeroLineCount > 2 || fullLineCount > 2)) {
      continue;
    }

    const neighborCounts: number[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => computeNeighborMines(solution, r, c, size))
    );

    const safeCells: number[] = [];
    for (let idx = 0; idx < size * size; idx++) {
      if (!mineIndices.has(idx)) safeCells.push(idx);
    }

    // Mezclamos todas las seguras sin excluir los 0 interiores
    const orderedSafe = shuffle(safeCells, rng);

    const revealedHints: (number | null)[][] = Array.from({ length: size }, () =>
      Array<number | null>(size).fill(null)
    );

    const initialRevealCount = Math.max(minHints, Math.floor(safeCells.length * 0.28));
    const revealedList: number[] = [];
    for (let i = 0; i < initialRevealCount && i < orderedSafe.length; i++) {
      const idx = orderedSafe[i];
      const r = Math.floor(idx / size);
      const c = idx % size;
      revealedHints[r][c] = neighborCounts[r][c];
      revealedList.push(idx);
    }

    // Fase 1: Desambiguación hasta certificar solución única (count === 1)
    let solveRes = countSolutions({ size, rowClues, colClues, revealedHints }, 2);
    let safetyCounter = 0;

    while (solveRes.count > 1 && safetyCounter < safeCells.length) {
      safetyCounter++;
      const solA = solveRes.solutions[0];
      const solB = solveRes.solutions[1];

      const separatingSafeCells: number[] = [];
      for (let i = 0; i < safeCells.length; i++) {
        const idx = safeCells[i];
        const r = Math.floor(idx / size);
        const c = idx % size;
        if (revealedHints[r][c] !== null) continue;
        if (solA[idx] !== solB[idx]) separatingSafeCells.push(idx);
      }

      let pickIdx = -1;
      if (separatingSafeCells.length > 0) {
        pickIdx = separatingSafeCells[Math.floor(rng() * separatingSafeCells.length)];
      } else {
        const remaining = orderedSafe.filter((idx) => {
          const r = Math.floor(idx / size);
          const c = idx % size;
          return revealedHints[r][c] === null;
        });
        if (remaining.length === 0) break;
        pickIdx = remaining[0];
      }

      const pr = Math.floor(pickIdx / size);
      const pc = pickIdx % size;
      revealedHints[pr][pc] = neighborCounts[pr][pc];
      revealedList.push(pickIdx);
      solveRes = countSolutions({ size, rowClues, colClues, revealedHints }, 2);
    }

    if (solveRes.count !== 1) continue;

    // Fase 2: Poda de pistas redundantes manteniendo siempre solución única
    const pruneOrder = shuffle(revealedList, rng);
    let currentCount = revealedList.length;
    const maxDesiredHints = Math.max(minHints, Math.floor(safeCells.length * 0.42));

    for (let i = 0; i < pruneOrder.length && currentCount > minHints; i++) {
      if (currentCount <= maxDesiredHints && i > Math.floor(pruneOrder.length * 0.45)) {
        break;
      }
      const idx = pruneOrder[i];
      const r = Math.floor(idx / size);
      const c = idx % size;
      const saved = revealedHints[r][c];
      revealedHints[r][c] = null;

      if (countSolutions({ size, rowClues, colClues, revealedHints }, 2).count === 1) {
        currentCount--;
      } else {
        revealedHints[r][c] = saved;
      }
    }

    const id =
      options.idOverride ??
      `md-${size}x${size}-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`;

    return {
      id,
      size,
      rowClues,
      colClues,
      revealedHints,
      solution,
      totalMines: mineIndices.size,
      label: options.label,
    };
  }

  return generateFallbackPuzzle(size, rng, options.idOverride, options.label);
}

/** Devuelve la fecha local en formato YYYY-MM-DD (100% local, sin servidor) */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Nivel Diario determinista a partir de la fecha YYYY-MM-DD.
 * Mismo día -> exactamente el mismo puzzle único en cualquier navegador.
 */
export function generateDailyPuzzle(dateKey: string): PuzzleBoard {
  const rng = createSeededRng(`MINEDOKU_DAILY_${dateKey}`);
  const dayNum = Number(dateKey.slice(-2)) || 1;
  const size: GridSize = dayNum % 3 === 0 ? 7 : 6;
  return generatePuzzle(size, {
    rng,
    idOverride: `daily-${dateKey}`,
    label: `Diario ${dateKey}`,
    allowZeroLines: true,
  });
}

function generateFallbackPuzzle(
  size: GridSize,
  rng: () => number,
  idOverride?: string,
  label?: string
): PuzzleBoard {
  const [minMines] = getMineRange(size);
  const allIndices = shuffle(
    Array.from({ length: size * size }, (_, i) => i),
    rng
  );
  const mineIndices = new Set(allIndices.slice(0, minMines));
  const solution: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => mineIndices.has(r * size + c))
  );
  const rowClues = Array.from({ length: size }, (_, r) =>
    solution[r].reduce((acc, m) => acc + (m ? 1 : 0), 0)
  );
  const colClues = Array.from({ length: size }, (_, c) => {
    let s = 0;
    for (let r = 0; r < size; r++) if (solution[r][c]) s++;
    return s;
  });
  const revealedHints: (number | null)[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      solution[r][c] ? null : computeNeighborMines(solution, r, c, size)
    )
  );
  return {
    id: idOverride ?? `md-fb-${size}x${size}-${Date.now().toString(36)}`,
    size,
    rowClues,
    colClues,
    revealedHints,
    solution,
    totalMines: minMines,
    label,
  };
}
