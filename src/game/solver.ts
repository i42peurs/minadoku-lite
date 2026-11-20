// ============================================================================
// SOLVER LÓGICO + BACKTRACKING Y MOTOR DE PISTAS DIDÁCTICAS
// Verifica solución única matemática (sin adivinar) y deduce el siguiente paso
// explicando el patrón lógico en español y devolviendo las casillas implicadas.
// ============================================================================

import type { CellCoord, CellMark, DidacticHint, PuzzleBoard, PuzzleSpec } from './types';

const UNKNOWN = -1;
const SAFE = 0;
const MINE = 1;

interface Constraint {
  cells: number[];
  target: number;
  kind: 'row' | 'col' | 'neighbor';
  index: number;
  hintValue?: number;
  row?: number;
  col?: number;
}

/**
 * Construye todas las restricciones del tablero:
 * - Total de minas en cada fila (admite 0)
 * - Total de minas en cada columna (admite 0)
 * - Vecindad 3×3 (8 adyacentes) de cada casilla numérica interior (admite 0)
 */
export function buildConstraints(spec: PuzzleSpec): Constraint[] {
  const { size, rowClues, colClues, revealedHints } = spec;
  const constraints: Constraint[] = [];

  for (let r = 0; r < size; r++) {
    const cells: number[] = [];
    for (let c = 0; c < size; c++) cells.push(r * size + c);
    constraints.push({ cells, target: rowClues[r], kind: 'row', index: r, row: r });
  }

  for (let c = 0; c < size; c++) {
    const cells: number[] = [];
    for (let r = 0; r < size; r++) cells.push(r * size + c);
    constraints.push({ cells, target: colClues[c], kind: 'col', index: c, col: c });
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const hint = revealedHints[r][c];
      if (hint !== null) {
        const neighbors: number[] = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              neighbors.push(nr * size + nc);
            }
          }
        }
        constraints.push({
          cells: neighbors,
          target: hint,
          kind: 'neighbor',
          index: r * size + c,
          hintValue: hint,
          row: r,
          col: c,
        });
      }
    }
  }

  return constraints;
}

function createInitialState(spec: PuzzleSpec): Int8Array {
  const { size, revealedHints } = spec;
  const state = new Int8Array(size * size);
  state.fill(UNKNOWN);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (revealedHints[r][c] !== null) {
        // Las casillas con número interior son siempre seguras
        state[r * size + c] = SAFE;
      }
    }
  }
  return state;
}

function isSubset(sub: number[], supSet: Set<number>): boolean {
  for (let i = 0; i < sub.length; i++) {
    if (!supSet.has(sub[i])) return false;
  }
  return true;
}

/**
 * Propagación lógica:
 * 1) Regla de completado (faltan 0 minas -> resto seguras)
 * 2) Regla de llenado (faltan K minas en K huecos -> todas minas)
 * 3) Regla de resta por subconjuntos (A ⊂ B -> diferencia determinada)
 */
function propagate(state: Int8Array, constraints: Constraint[]): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    const activeUnknowns: {
      c: Constraint;
      unknowns: number[];
      needed: number;
      set?: Set<number>;
    }[] = [];

    for (let i = 0; i < constraints.length; i++) {
      const con = constraints[i];
      let mines = 0;
      const unknowns: number[] = [];
      for (let j = 0; j < con.cells.length; j++) {
        const idx = con.cells[j];
        const v = state[idx];
        if (v === MINE) mines++;
        else if (v === UNKNOWN) unknowns.push(idx);
      }

      const needed = con.target - mines;
      if (needed < 0 || needed > unknowns.length) return false;

      if (unknowns.length > 0) {
        if (needed === 0) {
          for (let j = 0; j < unknowns.length; j++) state[unknowns[j]] = SAFE;
          changed = true;
        } else if (needed === unknowns.length) {
          for (let j = 0; j < unknowns.length; j++) state[unknowns[j]] = MINE;
          changed = true;
        } else {
          activeUnknowns.push({ c: con, unknowns, needed });
        }
      }
    }

    if (changed) continue;

    for (let i = 0; i < activeUnknowns.length; i++) {
      const a = activeUnknowns[i];
      if (a.unknowns.length <= 1) continue;
      for (let j = 0; j < activeUnknowns.length; j++) {
        if (i === j) continue;
        const b = activeUnknowns[j];
        if (a.unknowns.length >= b.unknowns.length) continue;

        if (!b.set) b.set = new Set(b.unknowns);
        if (!isSubset(a.unknowns, b.set)) continue;

        const aSet = a.set ?? (a.set = new Set(a.unknowns));
        const diff: number[] = [];
        for (let k = 0; k < b.unknowns.length; k++) {
          if (!aSet.has(b.unknowns[k])) diff.push(b.unknowns[k]);
        }

        const diffNeeded = b.needed - a.needed;
        if (diffNeeded < 0 || diffNeeded > diff.length) return false;
        if (diffNeeded === 0) {
          for (let k = 0; k < diff.length; k++) state[diff[k]] = SAFE;
          changed = true;
          break;
        } else if (diffNeeded === diff.length) {
          for (let k = 0; k < diff.length; k++) state[diff[k]] = MINE;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return true;
}

function pickBranchCell(state: Int8Array, constraints: Constraint[]): number {
  let bestCell = -1;
  let bestScore = Infinity;

  const degree = new Int16Array(state.length);
  const minGroupSize = new Int16Array(state.length);
  minGroupSize.fill(999);

  for (let i = 0; i < constraints.length; i++) {
    const con = constraints[i];
    let unknownCount = 0;
    let mines = 0;
    for (let j = 0; j < con.cells.length; j++) {
      const idx = con.cells[j];
      if (state[idx] === UNKNOWN) unknownCount++;
      else if (state[idx] === MINE) mines++;
    }
    if (unknownCount === 0) continue;
    const needed = con.target - mines;
    const slack = Math.min(needed, unknownCount - needed);
    const weight = unknownCount * 4 + slack;

    for (let j = 0; j < con.cells.length; j++) {
      const idx = con.cells[j];
      if (state[idx] === UNKNOWN) {
        degree[idx]++;
        if (weight < minGroupSize[idx]) minGroupSize[idx] = weight;
      }
    }
  }

  for (let idx = 0; idx < state.length; idx++) {
    if (state[idx] !== UNKNOWN) continue;
    const score = minGroupSize[idx] * 10 - degree[idx];
    if (score < bestScore) {
      bestScore = score;
      bestCell = idx;
    }
  }

  return bestCell;
}

function verifyFullSolution(state: Int8Array, constraints: Constraint[]): boolean {
  for (let i = 0; i < constraints.length; i++) {
    const con = constraints[i];
    let mines = 0;
    for (let j = 0; j < con.cells.length; j++) {
      if (state[con.cells[j]] === MINE) mines++;
    }
    if (mines !== con.target) return false;
  }
  return true;
}

export interface SolveResult {
  count: number;
  solutions: Int8Array[];
}

/**
 * Solver exacto (propagación + backtracking) que detiene la búsqueda al encontrar
 * `limit` soluciones (por defecto 2). Si `count === 1`, la solución es única.
 */
export function countSolutions(spec: PuzzleSpec, limit = 2): SolveResult {
  const constraints = buildConstraints(spec);
  const initialState = createInitialState(spec);
  const solutions: Int8Array[] = [];

  function dfs(current: Int8Array): void {
    if (solutions.length >= limit) return;
    if (!propagate(current, constraints)) return;

    const branchIdx = pickBranchCell(current, constraints);
    if (branchIdx === -1) {
      if (verifyFullSolution(current, constraints)) {
        solutions.push(current.slice());
      }
      return;
    }

    const mineBranch = current.slice();
    mineBranch[branchIdx] = MINE;
    dfs(mineBranch);

    if (solutions.length >= limit) return;

    const safeBranch = current.slice();
    safeBranch[branchIdx] = SAFE;
    dfs(safeBranch);
  }

  dfs(initialState);
  return { count: solutions.length, solutions };
}

export function hasUniqueSolution(spec: PuzzleSpec): boolean {
  return countSolutions(spec, 2).count === 1;
}

function idxToCoord(idx: number, size: number): CellCoord {
  return { r: Math.floor(idx / size), c: idx % size };
}

function describeConstraint(con: Constraint): string {
  if (con.kind === 'row') return `la fila ${(con.row ?? 0) + 1}`;
  if (con.kind === 'col') return `la columna ${(con.col ?? 0) + 1}`;
  return `el número ${con.hintValue} en (F${(con.row ?? 0) + 1}, C${(con.col ?? 0) + 1})`;
}

/**
 * Motor de Pista Didáctica:
 * Busca el paso lógico más claro y humano, colorea las casillas implicadas
 * (`relatedCells`) y redacta una explicación didáctica del patrón en español.
 * Las marcas '?' ('question') se tratan como incógnitas.
 */
export function findDidacticHint(puzzle: PuzzleBoard, marks: CellMark[][]): DidacticHint | null {
  const { size, revealedHints, solution } = puzzle;

  // 1. Verificar si el jugador colocó una Bandera o X contradictoria con la solución única
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (revealedHints[r][c] !== null) continue;
      const mark = marks[r][c];
      if (mark === 'flag' && !solution[r][c]) {
        return {
          row: r,
          col: c,
          action: 'safe',
          patternTitle: 'Revisión de marca',
          reason: `La casilla (F${r + 1}, C${c + 1}) marcada con bandera es en realidad segura. Cámbiala a X para desbloquear el tablero.`,
          relatedCells: [{ r, c }],
          isCorrection: true,
        };
      }
      if (mark === 'safe' && solution[r][c]) {
        return {
          row: r,
          col: c,
          action: 'flag',
          patternTitle: 'Revisión de marca',
          reason: `La casilla (F${r + 1}, C${c + 1}) marcada con X esconde una mina según la solución única.`,
          relatedCells: [{ r, c }],
          isCorrection: true,
        };
      }
    }
  }

  // 2. Construir estado lógico actual (las marcas '?' se dejan como UNKNOWN)
  const constraints = buildConstraints(puzzle);
  const state = createInitialState(puzzle);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      if (marks[r][c] === 'flag') state[idx] = MINE;
      else if (marks[r][c] === 'safe') state[idx] = SAFE;
    }
  }

  // 3. Deducción directa por una sola restricción (Ceros, Líneas llenas, Vecindad contra tope)
  const activeGroups: {
    con: Constraint;
    unknowns: number[];
    needed: number;
    set?: Set<number>;
  }[] = [];

  for (let i = 0; i < constraints.length; i++) {
    const con = constraints[i];
    let mines = 0;
    const unknowns: number[] = [];
    for (let j = 0; j < con.cells.length; j++) {
      const idx = con.cells[j];
      if (state[idx] === MINE) mines++;
      else if (state[idx] === UNKNOWN) unknowns.push(idx);
    }

    if (unknowns.length === 0) continue;
    const needed = con.target - mines;
    const targetCoord = idxToCoord(unknowns[0], size);

    const contextCells: CellCoord[] = con.cells.map((idx) => idxToCoord(idx, size));
    if (con.kind === 'neighbor' && con.row !== undefined && con.col !== undefined) {
      contextCells.push({ r: con.row, c: con.col });
    }

    if (needed === 0) {
      const isZeroClue = con.target === 0;
      if (con.kind === 'row') {
        return {
          row: targetCoord.r,
          col: targetCoord.c,
          action: 'safe',
          patternTitle: isZeroClue ? 'Regla del cero (fila)' : 'Fila completada',
          reason: isZeroClue
            ? `La fila ${(con.row ?? 0) + 1} marca 0 minas: todas las casillas resaltadas de esta fila son seguras (X).`
            : `La fila ${(con.row ?? 0) + 1} ya tiene todas sus ${con.target} minas marcadas; las casillas resaltadas restantes son seguras (X).`,
          relatedCells: contextCells,
          relatedRow: con.row,
        };
      }
      if (con.kind === 'col') {
        return {
          row: targetCoord.r,
          col: targetCoord.c,
          action: 'safe',
          patternTitle: isZeroClue ? 'Regla del cero (columna)' : 'Columna completada',
          reason: isZeroClue
            ? `La columna ${(con.col ?? 0) + 1} marca 0 minas: todas sus casillas resaltadas son seguras (X).`
            : `La columna ${(con.col ?? 0) + 1} ya alcanzó sus ${con.target} minas; las casillas libres resaltadas deben ser X.`,
          relatedCells: contextCells,
          relatedCol: con.col,
        };
      }
      return {
        row: targetCoord.r,
        col: targetCoord.c,
        action: 'safe',
        patternTitle: isZeroClue ? 'Regla del cero (interior)' : 'Vecindad completada',
        reason: isZeroClue
          ? `El 0 en (F${(con.row ?? 0) + 1}, C${(con.col ?? 0) + 1}) garantiza que ninguna de sus casillas vecinas resaltadas tiene mina.`
          : `El número ${con.hintValue} en (F${(con.row ?? 0) + 1}, C${(con.col ?? 0) + 1}) ya toca todas sus minas; sus vecinas restantes son seguras (X).`,
        relatedCells: contextCells,
      };
    }

    if (needed === unknowns.length) {
      if (con.kind === 'row') {
        return {
          row: targetCoord.r,
          col: targetCoord.c,
          action: 'flag',
          patternTitle: 'Línea llena (fila)',
          reason: `En la fila ${(con.row ?? 0) + 1} faltan ${needed} minas y quedan exactamente ${unknowns.length} casillas sin decidir: todas llevan Bandera.`,
          relatedCells: contextCells,
          relatedRow: con.row,
        };
      }
      if (con.kind === 'col') {
        return {
          row: targetCoord.r,
          col: targetCoord.c,
          action: 'flag',
          patternTitle: 'Línea llena (columna)',
          reason: `En la columna ${(con.col ?? 0) + 1} faltan ${needed} minas y quedan exactamente ${unknowns.length} huecos: todos son minas.`,
          relatedCells: contextCells,
          relatedCol: con.col,
        };
      }
      return {
        row: targetCoord.r,
        col: targetCoord.c,
        action: 'flag',
        patternTitle: 'Vecindad contra tope',
        reason: `Al número ${con.hintValue} en (F${(con.row ?? 0) + 1}, C${(con.col ?? 0) + 1}) le faltan ${needed} minas y solo quedan ${unknowns.length} vecinas disponibles.`,
        relatedCells: contextCells,
      };
    }

    activeGroups.push({ con, unknowns, needed });
  }

  // 4. Patrón de resta entre dos pistas (subconjunto A ⊂ B)
  for (let i = 0; i < activeGroups.length; i++) {
    const a = activeGroups[i];
    if (a.unknowns.length <= 1) continue;
    for (let j = 0; j < activeGroups.length; j++) {
      if (i === j) continue;
      const b = activeGroups[j];
      if (a.unknowns.length >= b.unknowns.length) continue;

      if (!b.set) b.set = new Set(b.unknowns);
      if (!isSubset(a.unknowns, b.set)) continue;

      const aSet = a.set ?? (a.set = new Set(a.unknowns));
      const diff = b.unknowns.filter((idx) => !aSet.has(idx));
      const diffNeeded = b.needed - a.needed;

      if (diff.length > 0 && (diffNeeded === 0 || diffNeeded === diff.length)) {
        const targetCoord = idxToCoord(diff[0], size);
        const relatedSet = new Set<number>([...a.unknowns, ...b.unknowns]);
        if (a.con.kind === 'neighbor') relatedSet.add(a.con.index);
        if (b.con.kind === 'neighbor') relatedSet.add(b.con.index);
        const relatedCells = Array.from(relatedSet).map((idx) => idxToCoord(idx, size));

        return {
          row: targetCoord.r,
          col: targetCoord.c,
          action: diffNeeded === 0 ? 'safe' : 'flag',
          patternTitle: 'Resta entre pistas',
          reason:
            diffNeeded === 0
              ? `Las minas que faltan en ${describeConstraint(b.con)} ya deben estar dentro de ${describeConstraint(a.con)}. Por resta, las casillas fuera de esa zona son seguras (X).`
              : `Al restar ${describeConstraint(a.con)} de ${describeConstraint(b.con)}, quedan ${diffNeeded} minas para ${diff.length} casillas fuera de la zona común: deben ser Bandera.`,
          relatedCells,
          relatedRow:
            b.con.kind === 'row' ? b.con.row : a.con.kind === 'row' ? a.con.row : undefined,
          relatedCol:
            b.con.kind === 'col' ? b.con.col : a.con.kind === 'col' ? a.con.col : undefined,
        };
      }
    }
  }

  // 5. Prueba por reducción al absurdo (contradicción si suponemos lo contrario)
  for (let idx = 0; idx < state.length; idx++) {
    if (state[idx] !== UNKNOWN) continue;
    const coord = idxToCoord(idx, size);

    const tryMine = state.slice();
    tryMine[idx] = MINE;
    if (!propagate(tryMine, constraints)) {
      return {
        row: coord.r,
        col: coord.c,
        action: 'safe',
        patternTitle: 'Reducción al absurdo',
        reason: `Si hubiera una mina en (F${coord.r + 1}, C${coord.c + 1}), se rompería la cuenta de minas de las filas, columnas y vecinos cercanos. Debe ser segura (X).`,
        relatedCells: [coord],
        relatedRow: coord.r,
        relatedCol: coord.c,
      };
    }

    const trySafe = state.slice();
    trySafe[idx] = SAFE;
    if (!propagate(trySafe, constraints)) {
      return {
        row: coord.r,
        col: coord.c,
        action: 'flag',
        patternTitle: 'Reducción al absurdo',
        reason: `Si (F${coord.r + 1}, C${coord.c + 1}) fuera segura, no existiría ninguna forma válida de completar los totales de minas. Aquí hay una mina.`,
        relatedCells: [coord],
        relatedRow: coord.r,
        relatedCol: coord.c,
      };
    }
  }

  // 6. Respaldo garantizado por la solución única
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (revealedHints[r][c] === null && marks[r][c] !== 'flag' && marks[r][c] !== 'safe') {
        return {
          row: r,
          col: c,
          action: solution[r][c] ? 'flag' : 'safe',
          patternTitle: 'Deducción global',
          reason: `Al combinar todas las pistas del tablero a la vez, la única solución posible fija (F${r + 1}, C${c + 1}) como ${
            solution[r][c] ? 'mina (Bandera)' : 'segura (X)'
          }.`,
          relatedCells: [{ r, c }],
          relatedRow: r,
          relatedCol: c,
        };
      }
    }
  }

  return null;
}

export const findLogicalHint = findDidacticHint;
