import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY_LESSONS } from './academy';
import { countSolutions, findDidacticHint, hasUniqueSolution } from './solver';
import { createSeededRng, generateDailyPuzzle, generatePuzzle } from './generator';
import {
  autoCompleteSafeMarks,
  buildShareText,
  calculateScore,
  calculateTokenReward,
  createEmptyMarks,
  evaluateBoard,
  evaluateDailyStatusOnDate,
  formatTime,
  getDailyRecoveryAllowance,
} from './rules';
import type { DailyStreakState, GridSize, PuzzleSpec } from './types';

test('countSolutions maneja tableros con 0 exteriores e interiores, ambiguos e imposibles', () => {
  const zeroClueSpec: PuzzleSpec = {
    size: 5,
    rowClues: [0, 1, 0, 1, 0],
    colClues: [0, 1, 0, 1, 0],
    revealedHints: [
      [null, null, null, null, 0],
      [null, null, null, 0, null],
      [null, null, null, null, null],
      [null, 0, null, null, null],
      [0, null, null, null, null],
    ],
  };
  assert.equal(countSolutions(zeroClueSpec, 2).count, 1);

  const ambiguousSpec: PuzzleSpec = {
    size: 5,
    rowClues: [1, 1, 0, 0, 0],
    colClues: [1, 1, 0, 0, 0],
    revealedHints: Array.from({ length: 5 }, () => Array<number | null>(5).fill(null)),
  };
  assert.equal(countSolutions(ambiguousSpec, 2).count, 2);

  const impossibleSpec: PuzzleSpec = {
    size: 5,
    rowClues: [5, 0, 0, 0, 0],
    colClues: [0, 0, 0, 0, 0],
    revealedHints: Array.from({ length: 5 }, () => Array<number | null>(5).fill(null)),
  };
  assert.equal(countSolutions(impossibleSpec, 2).count, 0);
});

test('todas las lecciones de la Academia tienen solución única y pistas coherentes', () => {
  assert.ok(ACADEMY_LESSONS.length >= 6);
  const guidedCount = ACADEMY_LESSONS.filter((l) => l.guided).length;
  const freeCount = ACADEMY_LESSONS.filter((l) => !l.guided).length;
  assert.ok(guidedCount >= 4, 'Debe haber al menos 4 niveles guiados');
  assert.ok(freeCount >= 2, 'Debe haber al menos 2 niveles de práctica sin guía');

  for (const lesson of ACADEMY_LESSONS) {
    assert.equal(
      hasUniqueSolution(lesson.puzzle),
      true,
      `La lección "${lesson.title}" debe tener exactamente 1 solución`
    );
  }
});

test('generatePuzzle garantiza solución única en 5x5, 6x6, 7x7 y 8x8 y admite valores 0', () => {
  const sizes: GridSize[] = [5, 6, 7, 8];
  const rng = createSeededRng('TEST_UNIQUE_ALL_SIZES_2026');
  let sawZeroClue = false;

  for (const size of sizes) {
    for (let k = 0; k < 3; k++) {
      const puzzle = generatePuzzle(size, rng);
      assert.equal(puzzle.size, size);
      assert.equal(hasUniqueSolution(puzzle), true, `Tablero ${size}x${size} #${k} debe ser único`);

      if (
        puzzle.rowClues.includes(0) ||
        puzzle.colClues.includes(0) ||
        puzzle.revealedHints.some((row) => row.includes(0))
      ) {
        sawZeroClue = true;
      }
    }
  }

  assert.equal(sawZeroClue, true, 'El generador debe permitir valores 0 en líneas o interior');
});

test('la marca de interrogación (?) NO cuenta como mina ni para victoria y es neutral en pistas', () => {
  const puzzle = ACADEMY_LESSONS[0].puzzle;
  const marks = createEmptyMarks(puzzle.size);

  // Colocamos '?' en todas las minas reales: NO debe contar como banderas ni ganar
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.solution[r][c]) marks[r][c] = 'question';
    }
  }

  const evalQuestion = evaluateBoard(puzzle, marks);
  assert.equal(evalQuestion.totalFlags, 0);
  assert.equal(evalQuestion.isSolved, false);

  // La pista didáctica debe seguir funcionando aunque haya '?' colocados
  const hint = findDidacticHint(puzzle, marks);
  assert.ok(hint !== null);
  assert.ok(hint.relatedCells.length >= 1);
  assert.ok(hint.patternTitle.length > 0);

  // Ahora marcamos todas las minas reales con Bandera y dejamos '?' en una segura
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.solution[r][c]) marks[r][c] = 'flag';
      else if (puzzle.revealedHints[r][c] === null) marks[r][c] = 'question';
    }
  }
  const evalWin = evaluateBoard(puzzle, marks);
  assert.equal(evalWin.isSolved, true);
  const completed = autoCompleteSafeMarks(puzzle, marks);
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.revealedHints[r][c] === null && !puzzle.solution[r][c]) {
        assert.equal(completed[r][c], 'safe');
      }
    }
  }
});

test('findDidacticHint resuelve por completo un tablero 6x6 dando pasos válidos', () => {
  const rng = createSeededRng('HINT_SOLVE_6X6');
  const puzzle = generatePuzzle(6, rng);
  const marks = createEmptyMarks(6);

  let steps = 0;
  while (!evaluateBoard(puzzle, marks).isSolved && steps < 40) {
    const hint = findDidacticHint(puzzle, marks);
    assert.ok(hint !== null);
    const expected = puzzle.solution[hint.row][hint.col] ? 'flag' : 'safe';
    assert.equal(hint.action, expected);
    marks[hint.row][hint.col] = hint.action;
    steps++;
  }
  assert.equal(evaluateBoard(puzzle, marks).isSolved, true);
});

test('Nivel Diario es determinista por fecha y tiene recuperación escalonada (1, 3, 5 intentos)', () => {
  const dayA = generateDailyPuzzle('2026-11-19');
  const dayB = generateDailyPuzzle('2026-11-19');
  const otherDay = generateDailyPuzzle('2026-11-20');

  assert.deepEqual(dayA.solution, dayB.solution);
  assert.deepEqual(dayA.revealedHints, dayB.revealedHints);
  assert.equal(hasUniqueSolution(dayA), true);
  assert.notDeepEqual(dayA.solution, otherDay.solution);

  assert.equal(getDailyRecoveryAllowance(2).attempts, 1);
  assert.equal(getDailyRecoveryAllowance(8).attempts, 3);
  assert.equal(getDailyRecoveryAllowance(18).attempts, 5);

  const missedYesterday: DailyStreakState = {
    currentStreak: 9,
    bestStreak: 9,
    lastCompletedDate: '2026-11-17',
    completedDates: ['2026-11-17'],
    recoveryChallengePending: null,
  };
  const evaluated = evaluateDailyStatusOnDate(missedYesterday, '2026-11-19');
  assert.ok(evaluated.recoveryChallengePending !== null);
  assert.equal(evaluated.recoveryChallengePending?.remainingAttempts, 3);
  assert.equal(evaluated.recoveryChallengePending?.missedDate, '2026-11-18');
});

test('economía de fichas evita farmeo fácil en 5x5 Zen y bonifica racha en Modo Vidas', () => {
  const zen5 = calculateTokenReward({
    mode: 'zen',
    size: 5,
    elapsedSeconds: 30,
    hintsUsed: 0,
    scannersUsed: 0,
    mistakes: 0,
  });
  assert.equal(zen5.tokens, 0);

  const hard8Clean = calculateTokenReward({
    mode: 'lives',
    size: 8,
    elapsedSeconds: 150,
    hintsUsed: 0,
    scannersUsed: 0,
    mistakes: 0,
  });
  assert.ok(hard8Clean.tokens >= 3);

  const scoreStreak1 = calculateScore({
    mode: 'lives',
    size: 6,
    elapsedSeconds: 80,
    hintsUsed: 0,
    scannersUsed: 0,
    mistakes: 0,
    livesStreakAfterWin: 1,
  });
  const scoreStreak5 = calculateScore({
    mode: 'lives',
    size: 6,
    elapsedSeconds: 80,
    hintsUsed: 0,
    scannersUsed: 0,
    mistakes: 0,
    livesStreakAfterWin: 5,
  });
  assert.ok(scoreStreak5 > scoreStreak1, 'Mayor racha sin morir debe dar más puntuación');

  const share = buildShareText(
    {
      mode: 'daily',
      size: 6,
      puzzleLabel: 'Diario 2026-11-19',
      elapsedSeconds: 74,
      scoreEarned: 240,
      tokensEarned: 3,
      tokenReason: 'Diario impecable',
      hintsUsed: 0,
      scannersUsed: 0,
      mistakes: 0,
      livesRemaining: 3,
      livesStreak: 0,
      dailyStreak: 4,
      recoveredDaily: false,
    },
    generateDailyPuzzle('2026-11-19')
  );
  assert.ok(share.includes('Minedoku'));
  assert.ok(share.includes(formatTime(74)));
});
