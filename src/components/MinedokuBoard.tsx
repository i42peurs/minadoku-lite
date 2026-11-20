// ============================================================================
// TABLERO INTERACTIVO MINEDOKU (N+1) × (N+1)
// Renderiza pistas exteriores (incluidos ceros), pistas interiores (incluidos
// ceros), marcas (Bandera, X, ?), resaltado de Pista Didáctica (casillas
// implicadas coloreadas), modo Escáner y guía paso a paso de la Academia.
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AcademyLesson,
  BoardEvaluation,
  CellMark,
  DidacticHint,
  InputTool,
  PuzzleBoard,
} from '../game/types';

interface MinedokuBoardProps {
  puzzle: PuzzleBoard;
  marks: CellMark[][];
  evaluation: BoardEvaluation;
  activeTool: InputTool;
  activeHint: DidacticHint | null;
  academyLesson: AcademyLesson | null;
  shakeCell: { r: number; c: number; key: number } | null;
  disabled: boolean;
  onCellPrimaryAction: (r: number, c: number) => void;
  onQuickFlag: (r: number, c: number) => void;
  onQuickQuestion: (r: number, c: number) => void;
  onQuickSafe: (r: number, c: number) => void;
  onApplyHint: () => void;
  onDismissHint: () => void;
  onCancelScanner: () => void;
}

const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 10;

function getNumberColorClass(n: number): string {
  switch (n) {
    case 0:
      return 'text-zinc-500 dark:text-slate-400';
    case 1:
      return 'text-teal-700 dark:text-teal-400';
    case 2:
      return 'text-blue-700 dark:text-sky-400';
    case 3:
      return 'text-amber-700 dark:text-amber-400';
    case 4:
      return 'text-rose-700 dark:text-rose-400';
    default:
      return 'text-purple-800 dark:text-purple-400';
  }
}

export const MinedokuBoard: React.FC<MinedokuBoardProps> = ({
  puzzle,
  marks,
  evaluation,
  activeTool,
  activeHint,
  academyLesson,
  shakeCell,
  disabled,
  onCellPrimaryAction,
  onQuickFlag,
  onQuickQuestion,
  onQuickSafe,
  onApplyHint,
  onDismissHint,
  onCancelScanner,
}) => {
  const { size, rowClues, colClues, revealedHints } = puzzle;

  // Guías visuales de lectura al pulsar una pista exterior o interior
  const [highlightRow, setHighlightRow] = useState<number | null>(null);
  const [highlightCol, setHighlightCol] = useState<number | null>(null);
  const [highlightBox, setHighlightBox] = useState<{ r: number; c: number } | null>(null);
  const [guideStepIdx, setGuideStepIdx] = useState<number>(0);

  // Seguimiento de pulsación larga en móvil (mantiene comodidad táctil para Bandera)
  const [chargingCell, setChargingCell] = useState<{ r: number; c: number } | null>(null);
  const pointerStateRef = useRef<{
    r: number;
    c: number;
    pointerId: number;
    startX: number;
    startY: number;
    longFired: boolean;
    cancelled: boolean;
    chargeTimer: number | null;
    fireTimer: number | null;
  } | null>(null);

  const clearPointerTimers = () => {
    const st = pointerStateRef.current;
    if (!st) return;
    if (st.chargeTimer !== null) window.clearTimeout(st.chargeTimer);
    if (st.fireTimer !== null) window.clearTimeout(st.fireTimer);
    pointerStateRef.current = null;
    setChargingCell(null);
  };

  useEffect(() => {
    setHighlightRow(null);
    setHighlightCol(null);
    setHighlightBox(null);
    setGuideStepIdx(0);
    return () => clearPointerTimers();
  }, [puzzle.id]);

  // Conjunto rápido de casillas implicadas en la Pista Didáctica para colorearlas
  const relatedHintSet = useMemo(() => {
    const set = new Set<string>();
    if (!activeHint) return set;
    for (const cell of activeHint.relatedCells) {
      set.add(`${cell.r}-${cell.c}`);
    }
    return set;
  }, [activeHint]);

  // Para pistas exteriores con valor 0, solo las tachamos cuando todas sus ocultas están marcadas con X
  const isRowVisuallyDone = (r: number): boolean => {
    if (!evaluation.rowSatisfied[r]) return false;
    if (rowClues[r] > 0) return true;
    for (let c = 0; c < size; c++) {
      if (revealedHints[r][c] === null && marks[r][c] !== 'safe') return false;
    }
    return true;
  };

  const isColVisuallyDone = (c: number): boolean => {
    if (!evaluation.colSatisfied[c]) return false;
    if (colClues[c] > 0) return true;
    for (let r = 0; r < size; r++) {
      if (revealedHints[r][c] === null && marks[r][c] !== 'safe') return false;
    }
    return true;
  };

  const handleCellPointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    clearPointerTimers();

    // En modo Escáner no activamos temporizador de pulsación larga
    if (activeTool === 'scanner') {
      pointerStateRef.current = {
        r,
        c,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        longFired: false,
        cancelled: false,
        chargeTimer: null,
        fireTimer: null,
      };
      return;
    }

    const chargeTimer = window.setTimeout(() => {
      if (pointerStateRef.current && !pointerStateRef.current.cancelled) {
        setChargingCell({ r, c });
      }
    }, 90);

    const fireTimer = window.setTimeout(() => {
      const st = pointerStateRef.current;
      if (st && !st.cancelled && st.r === r && st.c === c) {
        st.longFired = true;
        setChargingCell(null);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(16);
          } catch {
            // ignore
          }
        }
        onQuickFlag(r, c);
      }
    }, LONG_PRESS_MS);

    pointerStateRef.current = {
      r,
      c,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      longFired: false,
      cancelled: false,
      chargeTimer,
      fireTimer,
    };
  };

  const handleCellPointerMove = (e: React.PointerEvent) => {
    const st = pointerStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > MOVE_CANCEL_PX) {
      st.cancelled = true;
      clearPointerTimers();
    }
  };

  const handleCellPointerUp = (e: React.PointerEvent, r: number, c: number) => {
    const st = pointerStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const shouldTap = !st.cancelled && !st.longFired && st.r === r && st.c === c;
    clearPointerTimers();

    if (shouldTap && (e.pointerType !== 'mouse' || e.button === 0)) {
      if (e.shiftKey && activeTool !== 'scanner') {
        onQuickQuestion(r, c);
      } else {
        onCellPrimaryAction(r, c);
      }
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    if (disabled) return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      onQuickFlag(r, c);
      return;
    }
    if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      onQuickSafe(r, c);
      return;
    }
    if (e.key === '?' || e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      onQuickQuestion(r, c);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCellPrimaryAction(r, c);
      return;
    }
    let nr = r;
    let nc = c;
    if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
    else if (e.key === 'ArrowDown') nr = Math.min(size - 1, r + 1);
    else if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1);
    else if (e.key === 'ArrowRight') nc = Math.min(size - 1, c + 1);
    if (nr !== r || nc !== c) {
      e.preventDefault();
      const target = document.querySelector<HTMLElement>(`[data-cell="${nr}-${nc}"]`);
      target?.focus();
    }
  };

  const boardWidthClass =
    size === 5
      ? 'max-w-[348px] sm:max-w-[390px]'
      : size === 6
      ? 'max-w-[360px] sm:max-w-[420px]'
      : size === 7
      ? 'max-w-[372px] sm:max-w-[455px]'
      : 'max-w-[376px] sm:max-w-[488px]';

  const cellTextClass =
    size <= 6 ? 'text-lg sm:text-xl' : size === 7 ? 'text-base sm:text-lg' : 'text-sm sm:text-base';

  const clueTextClass = size <= 6 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm';

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2.5 px-2.5 py-1.5 sm:px-4">
      {/* Panel didáctico de la Academia (solo en niveles guiados; los de práctica son libres) */}
      {academyLesson && (
        <div
          data-testid="academy-guide-panel"
          className="w-full max-w-md rounded-xl border border-zinc-300/90 bg-white/90 px-3.5 py-2.5 text-xs text-zinc-700 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-900 dark:text-slate-50">
              {academyLesson.title}
            </span>
            <span className="font-mono-tabular text-[11px] text-teal-800 dark:text-teal-300">
              {academyLesson.patternTag}
            </span>
          </div>
          {academyLesson.guided && academyLesson.steps && academyLesson.steps.length > 0 ? (
            <div className="mt-1.5 flex flex-col gap-1.5">
              <p className="leading-relaxed">{academyLesson.steps[guideStepIdx]}</p>
              <div className="flex items-center justify-between border-t border-zinc-200/80 pt-1.5 dark:border-slate-800">
                <span className="font-mono-tabular text-[11px] text-zinc-500 dark:text-slate-400">
                  Paso {guideStepIdx + 1} / {academyLesson.steps.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={guideStepIdx === 0}
                    onClick={() => setGuideStepIdx((i) => Math.max(0, i - 1))}
                    className="rounded px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-stone-100 disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={guideStepIdx >= academyLesson.steps.length - 1}
                    onClick={() =>
                      setGuideStepIdx((i) => Math.min(academyLesson.steps!.length - 1, i + 1))
                    }
                    className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-35 dark:bg-teal-500 dark:text-slate-950"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-1 leading-relaxed text-zinc-600 dark:text-slate-300">
              {academyLesson.introText}
            </p>
          )}
        </div>
      )}

      {/* Aviso claro cuando el modo Escáner está armado */}
      {activeTool === 'scanner' && (
        <div
          role="status"
          data-testid="scanner-banner"
          className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-sky-500/45 bg-sky-50 px-3.5 py-2 text-xs text-sky-950 dark:border-sky-400/40 dark:bg-sky-950/40 dark:text-sky-100"
        >
          <span>
            <strong>Escáner activo (2◈):</strong> toca cualquier casilla oculta para revelarla.
          </span>
          <button
            type="button"
            onClick={onCancelScanner}
            className="font-semibold underline underline-offset-2 shrink-0"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Cuadrícula principal (N+1) x (N+1) */}
      <div
        data-testid="minedoku-board"
        className={`retro-panel w-full ${boardWidthClass} select-none touch-manipulation rounded-2xl border border-zinc-300/90 bg-white/95 p-2.5 dark:border-slate-700/90 dark:bg-slate-900/90 sm:p-3.5`}
      >
        <div
          className="grid gap-1 sm:gap-1.5"
          style={{ gridTemplateColumns: `repeat(${size + 1}, minmax(0, 1fr))` }}
        >
          {/* Esquina superior izquierda */}
          <div className="flex aspect-square items-center justify-center rounded-lg text-zinc-400 dark:text-slate-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" className="fill-current" />
              <path
                d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1m-8.6 8.6l-2.1 2.1"
                className="stroke-current"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Totales exteriores de Columna (admite 0) */}
          {colClues.map((clue, c) => {
            const done = isColVisuallyDone(c);
            const over = evaluation.colOver[c];
            const isHighlighted = highlightCol === c || activeHint?.relatedCol === c;
            return (
              <button
                key={`col-clue-${c}`}
                type="button"
                onClick={() => {
                  setHighlightBox(null);
                  setHighlightRow(null);
                  setHighlightCol((prev) => (prev === c ? null : c));
                }}
                aria-label={`Columna ${c + 1}: ${clue} minas${done ? ', completada' : ''}${
                  over ? ', exceso de banderas' : ''
                }`}
                className={`font-mono-tabular relative flex aspect-square items-center justify-center rounded-lg font-bold transition-colors ${clueTextClass} ${
                  over
                    ? 'bg-red-100 text-red-700 dark:bg-rose-950/70 dark:text-rose-300'
                    : done
                    ? 'text-zinc-400 line-through opacity-50 dark:text-slate-500'
                    : isHighlighted
                    ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/55 dark:text-sky-200'
                    : clue === 0
                    ? 'text-teal-800 hover:bg-stone-100 dark:text-teal-300 dark:hover:bg-slate-800'
                    : 'text-zinc-900 hover:bg-stone-100 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{clue}</span>
                {over && (
                  <span
                    className="absolute top-0.5 right-1 text-[10px] font-bold text-red-600 dark:text-rose-400"
                    aria-hidden="true"
                  >
                    !
                  </span>
                )}
              </button>
            );
          })}

          {/* Filas: Total exterior + N casillas */}
          {rowClues.map((rowClue, r) => {
            const rowDone = isRowVisuallyDone(r);
            const rowOver = evaluation.rowOver[r];
            const isRowHighlighted = highlightRow === r || activeHint?.relatedRow === r;

            return (
              <React.Fragment key={`row-${r}`}>
                <button
                  type="button"
                  onClick={() => {
                    setHighlightBox(null);
                    setHighlightCol(null);
                    setHighlightRow((prev) => (prev === r ? null : r));
                  }}
                  aria-label={`Fila ${r + 1}: ${rowClue} minas${rowDone ? ', completada' : ''}${
                    rowOver ? ', exceso de banderas' : ''
                  }`}
                  className={`font-mono-tabular relative flex aspect-square items-center justify-center rounded-lg font-bold transition-colors ${clueTextClass} ${
                    rowOver
                      ? 'bg-red-100 text-red-700 dark:bg-rose-950/70 dark:text-rose-300'
                      : rowDone
                      ? 'text-zinc-400 line-through opacity-50 dark:text-slate-500'
                      : isRowHighlighted
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/55 dark:text-sky-200'
                      : rowClue === 0
                      ? 'text-teal-800 hover:bg-stone-100 dark:text-teal-300 dark:hover:bg-slate-800'
                      : 'text-zinc-900 hover:bg-stone-100 dark:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{rowClue}</span>
                  {rowOver && (
                    <span
                      className="absolute top-0.5 right-1 text-[10px] font-bold text-red-600 dark:text-rose-400"
                      aria-hidden="true"
                    >
                      !
                    </span>
                  )}
                </button>

                {Array.from({ length: size }, (_, c) => {
                  const revealedVal = revealedHints[r][c];
                  const cellKey = `${r}-${c}`;
                  const isHintTarget =
                    activeHint !== null && activeHint.row === r && activeHint.col === c;
                  const isHintRelated = !isHintTarget && relatedHintSet.has(cellKey);
                  const isInHighlightLine = highlightRow === r || highlightCol === c;
                  const isInHighlightNeighborhood =
                    highlightBox !== null &&
                    Math.abs(highlightBox.r - r) <= 1 &&
                    Math.abs(highlightBox.c - c) <= 1;
                  const isShaking =
                    shakeCell !== null && shakeCell.r === r && shakeCell.c === c;

                  // Casilla numérica interior fija (siempre segura, incluye 0)
                  if (revealedVal !== null) {
                    const hintSat = evaluation.hintSatisfied[r][c];
                    const hintOv = evaluation.hintOver[r][c];
                    const isSelfBox = highlightBox?.r === r && highlightBox?.c === c;

                    return (
                      <button
                        key={`cell-${r}-${c}`}
                        type="button"
                        data-cell={cellKey}
                        onClick={() => {
                          setHighlightRow(null);
                          setHighlightCol(null);
                          setHighlightBox((prev) =>
                            prev && prev.r === r && prev.c === c ? null : { r, c }
                          );
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                        aria-label={`Pista fija fila ${r + 1} columna ${c + 1}: ${revealedVal} minas adyacentes`}
                        className={`font-mono-tabular relative flex aspect-square items-center justify-center rounded-lg border font-bold transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 ${cellTextClass} ${
                          hintOv
                            ? 'border-red-400 bg-red-50 text-red-700 dark:border-rose-500/70 dark:bg-rose-950/40 dark:text-rose-300'
                            : isHintRelated
                            ? 'border-sky-500 bg-sky-100/90 dark:border-sky-400 dark:bg-sky-900/50'
                            : isSelfBox
                            ? 'border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/50'
                            : isInHighlightLine || isInHighlightNeighborhood
                            ? 'border-teal-600/40 bg-stone-200/80 dark:border-teal-400/40 dark:bg-slate-800'
                            : 'border-zinc-200/90 bg-stone-100/95 dark:border-slate-700/80 dark:bg-slate-800/90'
                        } ${
                          hintSat && !hintOv && revealedVal > 0
                            ? 'opacity-50 line-through'
                            : getNumberColorClass(revealedVal)
                        }`}
                      >
                        {revealedVal}
                      </button>
                    );
                  }

                  // Casilla oculta interactiva (Vacía | Bandera | X | ?)
                  const mark = marks[r][c];
                  const isCharging = chargingCell?.r === r && chargingCell?.c === c;

                  return (
                    <button
                      key={`cell-${r}-${c}-${isShaking ? shakeCell.key : 0}`}
                      type="button"
                      data-cell={cellKey}
                      data-mark={mark}
                      data-hint-related={isHintRelated ? 'true' : undefined}
                      onPointerDown={(e) => handleCellPointerDown(e, r, c)}
                      onPointerMove={handleCellPointerMove}
                      onPointerUp={(e) => handleCellPointerUp(e, r, c)}
                      onPointerCancel={clearPointerTimers}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!disabled) onQuickFlag(r, c);
                      }}
                      onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                      aria-label={`Casilla fila ${r + 1} columna ${c + 1}: ${
                        mark === 'flag'
                          ? 'bandera'
                          : mark === 'safe'
                          ? 'segura X'
                          : mark === 'question'
                          ? 'duda interrogación'
                          : 'vacía'
                      }`}
                      className={`relative flex aspect-square items-center justify-center rounded-lg border transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                        isShaking
                          ? 'animate-cell-shake border-red-500 bg-red-50 dark:border-rose-400 dark:bg-rose-950/40'
                          : isHintTarget
                          ? 'border-amber-500 bg-amber-100/80 dark:border-amber-400 dark:bg-amber-950/50'
                          : isHintRelated
                          ? 'border-sky-500/80 bg-sky-100/80 dark:border-sky-400/75 dark:bg-sky-900/40'
                          : activeTool === 'scanner'
                          ? 'border-sky-500/50 bg-white hover:border-sky-600 hover:bg-sky-50 dark:border-sky-400/45 dark:bg-[#1d2330] dark:hover:border-sky-300 dark:hover:bg-sky-950/40'
                          : isInHighlightLine || isInHighlightNeighborhood
                          ? 'border-teal-600/50 bg-teal-50/45 dark:border-teal-400/50 dark:bg-slate-800'
                          : 'border-zinc-300 bg-white shadow-[0_1px_0_rgba(24,24,27,0.08)] hover:border-zinc-400 dark:border-slate-700 dark:bg-[#1e2430] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)] dark:hover:border-slate-500'
                      }`}
                    >
                      {isHintTarget && (
                        <span
                          className="animate-hint-ring pointer-events-none absolute inset-0.5 rounded-md border-2 border-amber-500 dark:border-amber-400"
                          aria-hidden="true"
                        />
                      )}

                      {isCharging && (
                        <svg
                          viewBox="0 0 36 36"
                          className="pointer-events-none absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] -rotate-90"
                          aria-hidden="true"
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray="88"
                            strokeDashoffset="22"
                            className="text-red-500/80 dark:text-rose-400/80"
                          />
                        </svg>
                      )}

                      {mark === 'flag' && (
                        <svg
                          viewBox="0 0 24 24"
                          className="animate-cell-pop h-[54%] w-[54%]"
                          aria-hidden="true"
                        >
                          <path
                            d="M6 20V4l11 4.5L6 13"
                            className="fill-red-600 stroke-red-600 dark:fill-rose-400 dark:stroke-rose-400"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}

                      {mark === 'safe' && (
                        <svg
                          viewBox="0 0 24 24"
                          className="animate-cell-pop h-[50%] w-[50%]"
                          aria-hidden="true"
                        >
                          <path
                            d="M6.5 6.5l11 11M17.5 6.5l-11 11"
                            className="stroke-teal-700 dark:stroke-teal-400"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}

                      {mark === 'question' && (
                        <span
                          className={`animate-cell-pop font-mono-tabular font-bold text-indigo-700 dark:text-indigo-300 ${cellTextClass}`}
                          aria-hidden="true"
                        >
                          ?
                        </span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Explicación de Pista Didáctica (colorea casillas implicadas + patrón lógico) */}
      {activeHint && (
        <div
          role="status"
          data-testid="hint-banner"
          className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-amber-500/45 bg-amber-50/95 px-3.5 py-2.5 text-xs text-zinc-800 dark:border-amber-400/35 dark:bg-amber-950/40 dark:text-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-300">
                {activeHint.patternTitle} ({activeHint.action === 'flag' ? 'Bandera' : 'Segura X'})
              </span>
              <p className="mt-0.5 leading-relaxed">{activeHint.reason}</p>
            </div>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label="Cerrar pista didáctica"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-100 shrink-0"
            >
              Cerrar
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-amber-500/20 pt-1.5">
            <span className="text-[11px] text-zinc-600 dark:text-slate-300">
              Azul: zona lógica · Ámbar: casilla deducida
            </span>
            <button
              type="button"
              onClick={onApplyHint}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 whitespace-nowrap"
            >
              Aplicar paso
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
