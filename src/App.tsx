// ============================================================================
// MINEDOKU — APLICACIÓN PRINCIPAL LOCAL (100% NAVEGADOR, SIN BACKEND)
// Orquesta la máquina de estados, los 4 modos (Academia, Zen, Vidas, Diario),
// marcas (Vacía, Bandera, X, ?), Pista Didáctica, Escáner, fichas y localStorage.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomToolbar } from './components/BottomToolbar';
import { GameHud } from './components/GameHud';
import { GameModal } from './components/GameModal';
import { MinedokuBoard } from './components/MinedokuBoard';
import { TitleScreen } from './components/TitleScreen';
import { ACADEMY_LESSONS } from './game/academy';
import { soundFx } from './game/audio';
import {
  computeNeighborMines,
  generateDailyPuzzle,
  generatePuzzle,
  getLocalDateKey,
} from './game/generator';
import {
  HINT_COST_TOKENS,
  SCANNER_COST_TOKENS,
  autoCompleteSafeMarks,
  buildShareText,
  calculateScore,
  calculateTokenReward,
  cloneMarks,
  createEmptyMarks,
  diffDays,
  evaluateBoard,
  evaluateDailyStatusOnDate,
} from './game/rules';
import { findDidacticHint } from './game/solver';
import {
  loadMuted,
  loadProgress,
  loadReducedMotion,
  loadTheme,
  saveMuted,
  saveProgress,
  saveReducedMotion,
  saveTheme,
} from './game/storage';
import type {
  CellMark,
  DidacticHint,
  GameMode,
  GamePhase,
  GridSize,
  InputTool,
  PlayerProgress,
  PuzzleBoard,
  RunSummary,
  ThemeMode,
} from './game/types';

const MAX_LIVES = 3;

function parseInitialParams(): {
  autostart: boolean;
  size: GridSize;
  mode: GameMode;
  lessonIdx: number;
} {
  if (typeof window === 'undefined') {
    return { autostart: false, size: 5, mode: 'academy', lessonIdx: 0 };
  }
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';
  const rawSize = Number(params.get('size'));
  const size: GridSize =
    rawSize === 5 || rawSize === 6 || rawSize === 7 || rawSize === 8 ? rawSize : 5;
  const rawMode = params.get('mode');
  const mode: GameMode =
    rawMode === 'academy' || rawMode === 'zen' || rawMode === 'lives' || rawMode === 'daily'
      ? rawMode
      : rawMode === 'challenge'
      ? 'lives'
      : 'zen';
  const rawLesson = Number(params.get('lesson'));
  const lessonIdx =
    Number.isInteger(rawLesson) && rawLesson >= 0 && rawLesson < ACADEMY_LESSONS.length
      ? rawLesson
      : 0;
  return { autostart, size, mode, lessonIdx };
}

function clonePuzzle(p: PuzzleBoard): PuzzleBoard {
  return {
    ...p,
    rowClues: p.rowClues.slice(),
    colClues: p.colClues.slice(),
    revealedHints: p.revealedHints.map((row) => row.slice()),
    solution: p.solution.map((row) => row.slice()),
  };
}

export default function App() {
  const initial = useMemo(() => parseInitialParams(), []);
  const todayKey = useMemo(() => getLocalDateKey(), []);

  // Preferencias locales
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadMuted();
    soundFx.setMuted(m);
    return m;
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => loadReducedMotion());

  // Progreso persistente en localStorage (actualizando estado diario al arrancar)
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    const loaded = loadProgress();
    const updatedDaily = evaluateDailyStatusOnDate(loaded.daily, getLocalDateKey());
    const synced = { ...loaded, daily: updatedDaily };
    saveProgress(synced);
    return synced;
  });

  // Selección del menú y estado de partida
  const [mode, setMode] = useState<GameMode>(initial.mode);
  const [size, setSize] = useState<GridSize>(initial.size);
  const [academyIdx, setAcademyIdx] = useState<number>(initial.lessonIdx);
  const [isRecoveryRun, setIsRecoveryRun] = useState<boolean>(false);
  const [activeDailyDate, setActiveDailyDate] = useState<string>(todayKey);

  const [phase, setPhase] = useState<GamePhase>(initial.autostart ? 'playing' : 'title');
  const [activeTool, setActiveTool] = useState<InputTool>('safe');

  // Tablero base (inmutable para poder Reiniciar) y tablero actual (el Escáner puede revelar pistas)
  const [basePuzzle, setBasePuzzle] = useState<PuzzleBoard>(() => {
    if (initial.mode === 'academy') return clonePuzzle(ACADEMY_LESSONS[initial.lessonIdx].puzzle);
    if (initial.mode === 'daily') return generateDailyPuzzle(getLocalDateKey());
    return generatePuzzle(initial.size, {
      label: initial.mode === 'lives' ? 'Vidas · Nivel 1' : 'Zen · Nivel 1',
    });
  });
  const [puzzle, setPuzzle] = useState<PuzzleBoard>(() => clonePuzzle(basePuzzle));
  const [marks, setMarks] = useState<CellMark[][]>(() => createEmptyMarks(basePuzzle.size));
  const [history, setHistory] = useState<{ marks: CellMark[][]; puzzle: PuzzleBoard }[]>([]);

  const [lives, setLives] = useState<number>(MAX_LIVES);
  const [mistakes, setMistakes] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [scannersUsed, setScannersUsed] = useState<number>(0);
  const [activeHint, setActiveHint] = useState<DidacticHint | null>(null);
  const [shakeCell, setShakeCell] = useState<{ r: number; c: number; key: number } | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [recoveryRemainingAfterFail, setRecoveryRemainingAfterFail] = useState<number | null>(null);

  // Sincronizar tema oscuro en <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  // Sincronizar reducir animaciones en <html>
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    saveReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Sincronizar estado del Game Shell en body
  useEffect(() => {
    document.body.dataset.state = phase === 'victory' ? 'gameover' : phase;
  }, [phase]);

  // Reloj activo durante la partida
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const evaluation = useMemo(() => evaluateBoard(puzzle, marks), [puzzle, marks]);
  const activeAcademyLesson = mode === 'academy' ? ACADEMY_LESSONS[academyIdx] ?? null : null;
  const usesLivesAndTimer = mode === 'lives' || (mode === 'daily' && isRecoveryRun);
  const hintIsFree = Boolean(mode === 'academy' && activeAcademyLesson?.guided);

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  /** Carga un tablero limpio y reinicia contadores de la partida actual */
  const bootBoard = useCallback(
    (
      nextPuzzle: PuzzleBoard,
      nextMode: GameMode,
      opts?: { recovery?: boolean; dailyDate?: string; nextAcademyIdx?: number }
    ) => {
      const fresh = clonePuzzle(nextPuzzle);
      setMode(nextMode);
      setSize(fresh.size);
      setBasePuzzle(fresh);
      setPuzzle(clonePuzzle(fresh));
      setMarks(createEmptyMarks(fresh.size));
      setHistory([]);
      setLives(MAX_LIVES);
      setMistakes(0);
      setElapsedSeconds(0);
      setHintsUsed(0);
      setScannersUsed(0);
      setActiveHint(null);
      setShakeCell(null);
      setRunSummary(null);
      setRecoveryRemainingAfterFail(null);
      setActiveTool('safe');
      setIsRecoveryRun(Boolean(opts?.recovery));
      if (opts?.dailyDate) setActiveDailyDate(opts.dailyDate);
      if (opts?.nextAcademyIdx !== undefined) setAcademyIdx(opts.nextAcademyIdx);
      setPhase('playing');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    []
  );

  /** Inicia partida según el modo y configuración elegidos */
  const startSelectedGame = useCallback(
    (overrideMode?: GameMode, overrideSize?: GridSize, overrideAcademyIdx?: number) => {
      const m = overrideMode ?? mode;
      const s = overrideSize ?? size;
      const aIdx = overrideAcademyIdx ?? academyIdx;

      if (m === 'academy') {
        const lesson = ACADEMY_LESSONS[aIdx] ?? ACADEMY_LESSONS[0];
        bootBoard(lesson.puzzle, 'academy', { nextAcademyIdx: aIdx });
        return;
      }

      if (m === 'daily') {
        const dailyBoard = generateDailyPuzzle(todayKey);
        bootBoard(dailyBoard, 'daily', { recovery: false, dailyDate: todayKey });
        return;
      }

      const levelNum = m === 'zen' ? progress.zenLevel : progress.livesLevel;
      const label = m === 'zen' ? `Zen · Nivel ${levelNum}` : `Vidas · Nivel ${levelNum}`;
      const nextBoard = generatePuzzle(s, { label });
      bootBoard(nextBoard, m);
    },
    [mode, size, academyIdx, todayKey, progress.zenLevel, progress.livesLevel, bootBoard]
  );

  /** Inicia el reto de rescate de la racha diaria sin anuncios */
  const startDailyRecoveryChallenge = useCallback(() => {
    const rec = progress.daily.recoveryChallengePending;
    if (!rec || rec.remainingAttempts <= 0) return;
    const missedBoard = generateDailyPuzzle(rec.missedDate);
    missedBoard.label = `Rescate Diario ${rec.missedDate}`;
    bootBoard(missedBoard, 'daily', { recovery: true, dailyDate: rec.missedDate });
  }, [progress.daily.recoveryChallengePending, bootBoard]);

  /** Registra victoria, calcula puntuación/fichas/rachas y construye resumen compartible */
  const handleVictory = useCallback(
    (finalPuzzle: PuzzleBoard, finalMarks: CellMark[][]) => {
      const completedMarks = autoCompleteSafeMarks(finalPuzzle, finalMarks);
      setMarks(completedMarks);
      setActiveHint(null);
      setActiveTool('safe');

      const isFirstTimeAcademy =
        mode === 'academy' &&
        activeAcademyLesson !== null &&
        !progress.completedAcademyIds.includes(activeAcademyLesson.id);

      const isFirstTimeDaily =
        mode === 'daily' && !progress.tokenRewardedDailyDates.includes(activeDailyDate);

      const nextLivesStreak = mode === 'lives' ? progress.livesStreak + 1 : progress.livesStreak;

      const scoreEarned = calculateScore({
        mode,
        size: finalPuzzle.size,
        elapsedSeconds,
        hintsUsed,
        scannersUsed,
        mistakes,
        livesStreakAfterWin: nextLivesStreak,
      });

      const reward = calculateTokenReward({
        mode,
        size: finalPuzzle.size,
        elapsedSeconds,
        hintsUsed,
        scannersUsed,
        mistakes,
        isFirstTimeAcademy,
        isFirstTimeDaily,
      });

      let nextDailyStreak = progress.daily.currentStreak;
      let recoveredNow = false;

      updateProgress((prev) => {
        const nextCompletedAcademy =
          mode === 'academy' && activeAcademyLesson && !prev.completedAcademyIds.includes(activeAcademyLesson.id)
            ? [...prev.completedAcademyIds, activeAcademyLesson.id]
            : prev.completedAcademyIds;

        const nextBestTimes = { ...prev.bestTimes };
        const timeKey = `${mode}_${finalPuzzle.size}`;
        if (nextBestTimes[timeKey] === undefined || elapsedSeconds < nextBestTimes[timeKey]) {
          nextBestTimes[timeKey] = elapsedSeconds;
        }

        let nextDaily = { ...prev.daily };
        const nextRewardedDailyDates =
          mode === 'daily' && !prev.tokenRewardedDailyDates.includes(activeDailyDate)
            ? [...prev.tokenRewardedDailyDates, activeDailyDate]
            : prev.tokenRewardedDailyDates;

        if (mode === 'daily') {
          if (isRecoveryRun && prev.daily.recoveryChallengePending) {
            // Rescate logrado: recuperamos la racha anterior y marcamos ayer como completado
            recoveredNow = true;
            const missed = prev.daily.recoveryChallengePending.missedDate;
            nextDailyStreak = prev.daily.recoveryChallengePending.previousStreak + 1;
            nextDaily = {
              currentStreak: nextDailyStreak,
              bestStreak: Math.max(prev.daily.bestStreak, nextDailyStreak),
              lastCompletedDate: missed,
              completedDates: prev.daily.completedDates.includes(missed)
                ? prev.daily.completedDates
                : [...prev.daily.completedDates, missed],
              recoveryChallengePending: null,
            };
          } else if (!prev.daily.completedDates.includes(activeDailyDate)) {
            const last = prev.daily.lastCompletedDate;
            const gap = last ? diffDays(last, activeDailyDate) : null;
            nextDailyStreak = gap === 1 ? prev.daily.currentStreak + 1 : 1;
            nextDaily = {
              currentStreak: nextDailyStreak,
              bestStreak: Math.max(prev.daily.bestStreak, nextDailyStreak),
              lastCompletedDate: activeDailyDate,
              completedDates: [...prev.daily.completedDates, activeDailyDate],
              recoveryChallengePending: null,
            };
          } else {
            nextDailyStreak = prev.daily.currentStreak;
          }
        }

        return {
          ...prev,
          tokens: prev.tokens + reward.tokens,
          scoreTotal: prev.scoreTotal + scoreEarned,
          zenLevel: mode === 'zen' ? prev.zenLevel + 1 : prev.zenLevel,
          livesLevel: mode === 'lives' ? prev.livesLevel + 1 : prev.livesLevel,
          livesStreak: mode === 'lives' ? prev.livesStreak + 1 : prev.livesStreak,
          bestLivesStreak:
            mode === 'lives'
              ? Math.max(prev.bestLivesStreak, prev.livesStreak + 1)
              : prev.bestLivesStreak,
          completedAcademyIds: nextCompletedAcademy,
          daily: nextDaily,
          bestTimes: nextBestTimes,
          tokenRewardedDailyDates: nextRewardedDailyDates,
        };
      });

      const baseSummary: Omit<RunSummary, 'shareText'> = {
        mode,
        size: finalPuzzle.size,
        puzzleLabel: finalPuzzle.label ?? `Tablero ${finalPuzzle.size}×${finalPuzzle.size}`,
        elapsedSeconds,
        scoreEarned,
        tokensEarned: reward.tokens,
        tokenReason: reward.reason,
        hintsUsed,
        scannersUsed,
        mistakes,
        livesRemaining: lives,
        livesStreak: nextLivesStreak,
        dailyStreak: nextDailyStreak,
        recoveredDaily: recoveredNow,
      };

      setRunSummary({
        ...baseSummary,
        shareText: buildShareText(baseSummary, finalPuzzle),
      });
      soundFx.playVictory();
      setPhase('victory');
    },
    [
      mode,
      activeAcademyLesson,
      progress,
      activeDailyDate,
      elapsedSeconds,
      hintsUsed,
      scannersUsed,
      mistakes,
      isRecoveryRun,
      lives,
      updateProgress,
    ]
  );

  /** Registra un fallo de vida en Modo Vidas o Reto de Rescate Diario */
  const handleMistake = useCallback(
    (r: number, c: number) => {
      soundFx.playError();
      setMistakes((m) => m + 1);
      setShakeCell({ r, c, key: Date.now() });
      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          soundFx.playDefeat();
          if (mode === 'lives') {
            // Racha paralela de Modo Vidas NO es recuperable: vuelve a 0 al morir
            updateProgress((p) => ({ ...p, livesStreak: 0 }));
          } else if (mode === 'daily' && isRecoveryRun) {
            updateProgress((p) => {
              const rec = p.daily.recoveryChallengePending;
              if (!rec) return p;
              const left = rec.remainingAttempts - 1;
              setRecoveryRemainingAfterFail(left);
              if (left <= 0) {
                return {
                  ...p,
                  daily: {
                    ...p.daily,
                    currentStreak: 0,
                    recoveryChallengePending: null,
                  },
                };
              }
              return {
                ...p,
                daily: {
                  ...p.daily,
                  recoveryChallengePending: { ...rec, remainingAttempts: left },
                },
              };
            });
          }
          setPhase('gameover');
        }
        return nextLives;
      });
    },
    [mode, isRecoveryRun, updateProgress]
  );

  /** Aplica una marca ('safe' | 'flag' | 'question') sobre la casilla (r, c) */
  const applyMarkAction = useCallback(
    (r: number, c: number, intent: 'safe' | 'flag' | 'question') => {
      if (phase !== 'playing') return;
      if (puzzle.revealedHints[r][c] !== null) return;

      const currentMark = marks[r][c];
      const nextMark: CellMark = currentMark === intent ? 'empty' : intent;

      // IMPORTANTE: La interrogación ('question') es una marca visual de duda:
      // NUNCA penaliza vidas ni cuenta como mina.
      if (usesLivesAndTimer && (nextMark === 'flag' || nextMark === 'safe')) {
        const isMine = puzzle.solution[r][c];
        const isMistake =
          (nextMark === 'flag' && !isMine) || (nextMark === 'safe' && isMine);
        if (isMistake) {
          handleMistake(r, c);
          return;
        }
      }

      const prevSnap = { marks: cloneMarks(marks), puzzle: clonePuzzle(puzzle) };
      const nextMarks = cloneMarks(marks);
      nextMarks[r][c] = nextMark;

      const nextEval = evaluateBoard(puzzle, nextMarks);
      setHistory((prev) => [...prev, prevSnap]);
      if (activeHint && activeHint.row === r && activeHint.col === c) {
        setActiveHint(null);
      }

      if (nextEval.isSolved) {
        handleVictory(puzzle, nextMarks);
        return;
      }

      setMarks(nextMarks);

      const newlySatisfiedLine =
        (nextMark === 'flag' && !evaluation.rowSatisfied[r] && nextEval.rowSatisfied[r]) ||
        (nextMark === 'flag' && !evaluation.colSatisfied[c] && nextEval.colSatisfied[c]);

      if (newlySatisfiedLine) soundFx.playLineComplete();
      else if (nextMark === 'flag') soundFx.playMarkFlag();
      else if (nextMark === 'safe') soundFx.playMarkSafe();
      else if (nextMark === 'question') soundFx.playMarkQuestion();
      else soundFx.playClearMark();
    },
    [
      phase,
      puzzle,
      marks,
      usesLivesAndTimer,
      activeHint,
      evaluation,
      handleMistake,
      handleVictory,
    ]
  );

  /** Escáner / Revelar: gasta 2 fichas y revela la casilla elegida por el jugador */
  const applyScannerAt = useCallback(
    (r: number, c: number) => {
      if (phase !== 'playing') return;
      if (puzzle.revealedHints[r][c] !== null) return;
      if (progress.tokens < SCANNER_COST_TOKENS) {
        setActiveTool('safe');
        return;
      }

      const prevSnap = { marks: cloneMarks(marks), puzzle: clonePuzzle(puzzle) };
      const nextPuzzle = clonePuzzle(puzzle);
      const nextMarks = cloneMarks(marks);

      if (nextPuzzle.solution[r][c]) {
        // Es mina -> plantamos Bandera confirmada
        nextMarks[r][c] = 'flag';
      } else {
        // Es segura -> la revelamos como casilla numérica interior (incluyendo 0)
        nextPuzzle.revealedHints[r][c] = computeNeighborMines(
          nextPuzzle.solution,
          r,
          c,
          nextPuzzle.size
        );
        nextMarks[r][c] = 'empty';
      }

      updateProgress((p) => ({
        ...p,
        tokens: Math.max(0, p.tokens - SCANNER_COST_TOKENS),
      }));
      setScannersUsed((s) => s + 1);
      setHistory((prev) => [...prev, prevSnap]);
      setActiveHint(null);
      setActiveTool('safe');
      soundFx.playScanner();

      const nextEval = evaluateBoard(nextPuzzle, nextMarks);
      setPuzzle(nextPuzzle);
      if (nextEval.isSolved) {
        handleVictory(nextPuzzle, nextMarks);
      } else {
        setMarks(nextMarks);
      }
    },
    [phase, puzzle, marks, progress.tokens, updateProgress, handleVictory]
  );

  /** Acción principal al tocar/hacer clic en una casilla según la herramienta activa */
  const handleCellPrimaryAction = useCallback(
    (r: number, c: number) => {
      if (activeTool === 'scanner') {
        applyScannerAt(r, c);
      } else {
        applyMarkAction(r, c, activeTool);
      }
    },
    [activeTool, applyScannerAt, applyMarkAction]
  );

  /** Pista Didáctica: gasta 1 ficha (gratis en Academia guiada), colorea zona y explica patrón */
  const handleRequestHint = useCallback(() => {
    if (phase !== 'playing') return;
    if (!hintIsFree && progress.tokens < HINT_COST_TOKENS) return;

    const hint = findDidacticHint(puzzle, marks);
    if (!hint) return;

    if (!hintIsFree) {
      updateProgress((p) => ({
        ...p,
        tokens: Math.max(0, p.tokens - HINT_COST_TOKENS),
      }));
    }
    setActiveHint(hint);
    setHintsUsed((h) => h + 1);
    soundFx.playHint();
  }, [phase, hintIsFree, progress.tokens, puzzle, marks, updateProgress]);

  const handleApplyHint = useCallback(() => {
    if (!activeHint || phase !== 'playing') return;
    const { row, col, action } = activeHint;
    setActiveHint(null);
    applyMarkAction(row, col, action);
  }, [activeHint, phase, applyMarkAction]);

  const handleUndo = useCallback(() => {
    if (phase !== 'playing' || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setMarks(prev.marks);
    setPuzzle(prev.puzzle);
    setActiveHint(null);
    soundFx.playUndo();
  }, [phase, history]);

  const handleResetSameBoard = useCallback(() => {
    setPuzzle(clonePuzzle(basePuzzle));
    setMarks(createEmptyMarks(basePuzzle.size));
    setHistory([]);
    setLives(MAX_LIVES);
    setMistakes(0);
    setElapsedSeconds(0);
    setActiveHint(null);
    setShakeCell(null);
    setActiveTool('safe');
    setPhase('playing');
    soundFx.playUndo();
  }, [basePuzzle]);

  const handleNextAfterVictory = useCallback(() => {
    if (mode === 'academy') {
      const nextIdx = academyIdx + 1;
      if (nextIdx < ACADEMY_LESSONS.length) {
        startSelectedGame('academy', 5, nextIdx);
      } else {
        setPhase('title');
      }
      return;
    }
    if (mode === 'daily') {
      setPhase('title');
      return;
    }
    startSelectedGame(mode, size);
  }, [mode, academyIdx, size, startSelectedGame]);

  const handleToggleTheme = useCallback(
    () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    []
  );
  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFx.setMuted(next);
      saveMuted(next);
      return next;
    });
  }, []);
  const handleToggleReducedMotion = useCallback(() => setReducedMotion((r) => !r), []);

  // Atajos de teclado en PC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'title') {
        if (e.key === 'Enter' || (e.key === ' ' && document.activeElement === document.body)) {
          e.preventDefault();
          startSelectedGame();
        }
        return;
      }

      if (phase === 'playing') {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTool('flag');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTool('safe');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTool('question');
        } else if (e.key === '4') {
          e.preventDefault();
          if (progress.tokens >= SCANNER_COST_TOKENS || activeTool === 'scanner') {
            setActiveTool((t) => (t === 'scanner' ? 'safe' : 'scanner'));
          }
        } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          if (activeTool === 'scanner') setActiveTool('safe');
          else setPhase('paused');
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleRequestHint();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleResetSameBoard();
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          handleToggleMute();
        }
        return;
      }

      if (phase === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setPhase('playing');
        }
        return;
      }

      if (phase === 'victory' && e.key === 'Enter') {
        e.preventDefault();
        handleNextAfterVictory();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    activeTool,
    progress.tokens,
    startSelectedGame,
    handleUndo,
    handleRequestHint,
    handleResetSameBoard,
    handleToggleMute,
    handleNextAfterVictory,
  ]);

  if (phase === 'title') {
    return (
      <div className="min-h-full w-full bg-[#f3f1ea] text-zinc-900 dark:bg-[#12151c] dark:text-slate-100">
        <TitleScreen
          selectedMode={mode}
          selectedSize={size}
          selectedAcademyIdx={academyIdx}
          todayKey={todayKey}
          theme={theme}
          muted={muted}
          reducedMotion={reducedMotion}
          progress={progress}
          onSelectMode={setMode}
          onSelectSize={setSize}
          onSelectAcademyIdx={setAcademyIdx}
          onToggleTheme={handleToggleTheme}
          onToggleMute={handleToggleMute}
          onToggleReducedMotion={handleToggleReducedMotion}
          onStartGame={() => startSelectedGame()}
          onStartDailyRecovery={startDailyRecoveryChallenge}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col justify-between bg-[#f3f1ea] text-zinc-900 dark:bg-[#12151c] dark:text-slate-100">
      <GameHud
        size={puzzle.size}
        mode={mode}
        levelLabel={puzzle.label ?? `${mode.toUpperCase()}`}
        theme={theme}
        muted={muted}
        reducedMotion={reducedMotion}
        tokens={progress.tokens}
        remainingMines={puzzle.totalMines - evaluation.totalFlags}
        elapsedSeconds={elapsedSeconds}
        lives={lives}
        maxLives={MAX_LIVES}
        showLivesAndTimer={usesLivesAndTimer}
        livesStreak={progress.livesStreak}
        dailyStreak={progress.daily.currentStreak}
        isRecoveryRun={isRecoveryRun}
        canUndo={history.length > 0}
        canGenerateNew={mode === 'zen' || mode === 'lives'}
        onUndo={handleUndo}
        onReset={handleResetSameBoard}
        onNewLevel={() => startSelectedGame(mode, size)}
        onPause={() => setPhase('paused')}
        onToggleMute={handleToggleMute}
        onToggleReducedMotion={handleToggleReducedMotion}
        onToggleTheme={handleToggleTheme}
        onReturnTitle={() => setPhase('title')}
      />

      <main className="my-auto flex w-full flex-1 flex-col items-center justify-center py-1">
        <MinedokuBoard
          puzzle={puzzle}
          marks={marks}
          evaluation={evaluation}
          activeTool={activeTool}
          activeHint={activeHint}
          academyLesson={activeAcademyLesson}
          shakeCell={shakeCell}
          disabled={phase !== 'playing'}
          onCellPrimaryAction={handleCellPrimaryAction}
          onQuickFlag={(r, c) => applyMarkAction(r, c, 'flag')}
          onQuickQuestion={(r, c) => applyMarkAction(r, c, 'question')}
          onQuickSafe={(r, c) => applyMarkAction(r, c, 'safe')}
          onApplyHint={handleApplyHint}
          onDismissHint={() => setActiveHint(null)}
          onCancelScanner={() => setActiveTool('safe')}
        />
      </main>

      <BottomToolbar
        activeTool={activeTool}
        tokens={progress.tokens}
        hintIsFree={hintIsFree}
        disabled={phase !== 'playing'}
        onSelectTool={setActiveTool}
        onRequestHint={handleRequestHint}
      />

      {(phase === 'paused' || phase === 'victory' || phase === 'gameover') && (
        <GameModal
          phase={phase}
          size={puzzle.size}
          mode={mode}
          levelLabel={puzzle.label ?? `${puzzle.size}×${puzzle.size}`}
          elapsedSeconds={elapsedSeconds}
          summary={runSummary}
          hasNextAcademyLesson={mode === 'academy' && academyIdx + 1 < ACADEMY_LESSONS.length}
          recoveryRemainingAfterFail={recoveryRemainingAfterFail}
          onResume={() => setPhase('playing')}
          onNextLevel={handleNextAfterVictory}
          onRetrySame={handleResetSameBoard}
          onReturnTitle={() => setPhase('title')}
        />
      )}
    </div>
  );
}
