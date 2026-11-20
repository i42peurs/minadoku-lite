// ============================================================================
// MODAL DE PAUSA, RESUMEN DE VICTORIA (CON COMPARTIR) Y FIN DE PARTIDA
// ============================================================================

import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { formatTime } from '../game/rules';
import type { GameMode, GamePhase, GridSize, RunSummary } from '../game/types';

interface GameModalProps {
  phase: Extract<GamePhase, 'paused' | 'victory' | 'gameover'>;
  size: GridSize;
  mode: GameMode;
  levelLabel: string;
  elapsedSeconds: number;
  summary: RunSummary | null;
  hasNextAcademyLesson: boolean;
  recoveryRemainingAfterFail: number | null;
  onResume: () => void;
  onNextLevel: () => void;
  onRetrySame: () => void;
  onReturnTitle: () => void;
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback abajo
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export const GameModal: React.FC<GameModalProps> = ({
  phase,
  size,
  mode,
  levelLabel,
  elapsedSeconds,
  summary,
  hasNextAcademyLesson,
  recoveryRemainingAfterFail,
  onResume,
  onNextLevel,
  onRetrySame,
  onReturnTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const isVictory = phase === 'victory';
  const isDefeat = phase === 'gameover';
  const isPaused = phase === 'paused';

  const handleShare = async () => {
    if (!summary) return;
    await copyTextSafe(summary.shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4"
    >
      <div className="retro-panel w-full max-w-md rounded-2xl border border-zinc-300 bg-[#f3f1ea] p-5 shadow-xl dark:border-slate-700 dark:bg-[#171b23] sm:p-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono-tabular text-xs font-semibold text-zinc-500 dark:text-slate-400">
            {levelLabel} · {size}×{size}
          </span>
          <h2
            id="game-modal-title"
            className="font-display text-2xl font-bold text-zinc-900 dark:text-slate-50"
          >
            {isVictory
              ? summary?.recoveredDaily
                ? '¡Racha diaria rescatada!'
                : 'Tablero completado'
              : isDefeat
              ? 'Sin vidas restantes'
              : 'Partida en pausa'}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-slate-300">
            {isVictory
              ? summary?.recoveredDaily
                ? 'Superaste el reto de rescate sin anuncios. Tu racha diaria sigue viva.'
                : 'Todas las minas han sido deducidas con lógica exacta.'
              : isDefeat
              ? mode === 'daily'
                ? recoveryRemainingAfterFail && recoveryRemainingAfterFail > 0
                  ? `Te quedan ${recoveryRemainingAfterFail} oportunidades para rescatar tu racha diaria.`
                  : 'Se agotaron los intentos de rescate para este día.'
                : 'Has perdido las 3 vidas. Tu racha sin morir vuelve a 0 (no es recuperable).'
              : 'Tu tablero, marcas y tiempo están pausados.'}
          </p>
        </div>

        {/* Resumen detallado en Victoria */}
        {isVictory && summary && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 border-y border-zinc-300/80 py-3 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-slate-400">
                  Tiempo
                </span>
                <span className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-slate-100">
                  {formatTime(summary.elapsedSeconds)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-slate-400">
                  Puntos
                </span>
                <span className="font-mono-tabular text-lg font-bold text-zinc-900 dark:text-slate-100">
                  +{summary.scoreEarned}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-slate-400">
                  Fichas
                </span>
                <span className="font-mono-tabular text-lg font-bold text-amber-700 dark:text-amber-300">
                  +{summary.tokensEarned}◈
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-slate-300">
              <span>{summary.tokenReason}</span>
              <span className="font-mono-tabular">
                Ayudas: {summary.hintsUsed + summary.scannersUsed} · Errores: {summary.mistakes}
              </span>
            </div>

            {summary.mode === 'lives' && (
              <p className="font-mono-tabular text-xs font-semibold text-orange-700 dark:text-orange-300">
                Racha sin morir: {summary.livesStreak} (multiplicador ×
                {(1 + Math.min(10, Math.max(0, summary.livesStreak - 1)) * 0.15).toFixed(2)})
              </p>
            )}

            {summary.mode === 'daily' && (
              <p className="font-mono-tabular text-xs font-semibold text-teal-800 dark:text-teal-300">
                Racha diaria actual: {summary.dailyStreak} día
                {summary.dailyStreak === 1 ? '' : 's'}
              </p>
            )}

            {/* Botón Compartir */}
            <button
              type="button"
              onClick={handleShare}
              data-testid="share-result-btn"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-teal-700/40 bg-teal-50 px-4 text-sm font-semibold text-teal-900 transition-colors hover:bg-teal-100 dark:border-teal-400/40 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-950/70 whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>¡Resultado copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Compartir resultado</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Resumen compacto en Pausa o Derrota */}
        {!isVictory && (
          <div className="mt-4 flex items-center justify-between border-y border-zinc-300/80 py-3 text-xs text-zinc-600 dark:border-slate-800 dark:text-slate-300">
            <span>Tiempo transcurrido</span>
            <span className="font-mono-tabular text-base font-bold text-zinc-900 dark:text-slate-100">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        )}

        {/* Botones de navegación */}
        <div className="mt-5 flex flex-col gap-2">
          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 whitespace-nowrap"
            >
              Reanudar
            </button>
          )}

          {isVictory && (
            <button
              type="button"
              data-start="true"
              onClick={
                mode === 'daily' || (mode === 'academy' && !hasNextAcademyLesson)
                  ? onReturnTitle
                  : onNextLevel
              }
              className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 whitespace-nowrap"
            >
              {mode === 'daily'
                ? 'Volver al menú'
                : mode === 'academy'
                ? hasNextAcademyLesson
                  ? 'Siguiente lección'
                  : 'Academia completada · Menú'
                : 'Siguiente nivel'}
            </button>
          )}

          {isDefeat && (
            <button
              type="button"
              data-start="true"
              onClick={
                mode === 'daily' &&
                recoveryRemainingAfterFail !== null &&
                recoveryRemainingAfterFail <= 0
                  ? onReturnTitle
                  : onRetrySame
              }
              className="h-11 w-full rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 whitespace-nowrap"
            >
              {mode === 'daily' &&
              recoveryRemainingAfterFail !== null &&
              recoveryRemainingAfterFail <= 0
                ? 'Volver al menú'
                : 'Reintentar tablero'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={isDefeat && mode !== 'daily' ? onNextLevel : onRetrySame}
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              {isDefeat && mode !== 'daily' ? 'Nuevo nivel' : 'Repetir tablero'}
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              Menú principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
