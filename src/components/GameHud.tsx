// ============================================================================
// HUD PERIMETRAL SUPERIOR COMPACTO
// Muestra estado en vivo (minas restantes, fichas, vidas/reloj/racha según modo)
// y acciones utilitarias (Deshacer, Reiniciar, Nuevo, Sonido, Animaciones, Tema, Pausa).
// ============================================================================

import React from 'react';
import {
  Flame,
  Moon,
  Pause,
  RotateCcw,
  Sparkles,
  Sun,
  Undo2,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
} from 'lucide-react';
import { formatTime } from '../game/rules';
import type { GameMode, GridSize, ThemeMode } from '../game/types';

interface GameHudProps {
  size: GridSize;
  mode: GameMode;
  levelLabel: string;
  theme: ThemeMode;
  muted: boolean;
  reducedMotion: boolean;
  tokens: number;
  remainingMines: number;
  elapsedSeconds: number;
  lives: number;
  maxLives: number;
  showLivesAndTimer: boolean;
  livesStreak: number;
  dailyStreak: number;
  isRecoveryRun: boolean;
  canUndo: boolean;
  canGenerateNew: boolean;
  onUndo: () => void;
  onReset: () => void;
  onNewLevel: () => void;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleReducedMotion: () => void;
  onToggleTheme: () => void;
  onReturnTitle: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  size,
  mode,
  levelLabel,
  theme,
  muted,
  reducedMotion,
  tokens,
  remainingMines,
  elapsedSeconds,
  lives,
  maxLives,
  showLivesAndTimer,
  livesStreak,
  dailyStreak,
  isRecoveryRun,
  canUndo,
  canGenerateNew,
  onUndo,
  onReset,
  onNewLevel,
  onPause,
  onToggleMute,
  onToggleReducedMotion,
  onToggleTheme,
  onReturnTitle,
}) => {
  return (
    <header className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-2.5 pt-2.5 sm:px-4 sm:pt-3.5">
      {/* Fila 1: Identidad de partida y contadores numéricos tabulares */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onReturnTitle}
            aria-label="Volver al menú principal"
            className="font-display text-base font-bold tracking-tight text-zinc-900 hover:text-teal-700 dark:text-slate-50 dark:hover:text-teal-400 sm:text-lg whitespace-nowrap shrink-0"
          >
            Minedoku
          </button>
          <span className="text-xs text-zinc-400 dark:text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="truncate font-mono-tabular text-xs font-semibold text-zinc-600 dark:text-slate-300">
            {levelLabel} ({size}×{size})
          </span>
        </div>

        {/* Telemetría viva */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* Minas restantes */}
          <div className="flex items-center gap-1" title="Minas pendientes por marcar">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path
                d="M6 20V4l11 4.5L6 13"
                className="fill-red-600 stroke-red-600 dark:fill-rose-400 dark:stroke-rose-400"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <span
              data-testid="mines-remaining"
              className={`font-mono-tabular text-sm font-bold ${
                remainingMines < 0
                  ? 'text-red-600 dark:text-rose-400'
                  : 'text-zinc-900 dark:text-slate-100'
              }`}
            >
              {remainingMines}
            </span>
          </div>

          {/* Saldo de fichas */}
          <div
            className="flex items-center gap-1 text-amber-800 dark:text-amber-300"
            title="Fichas disponibles para Pista didáctica (1) y Escáner (2)"
            data-testid="tokens-display"
          >
            <span className="text-xs font-bold" aria-hidden="true">
              ◈
            </span>
            <span className="font-mono-tabular text-sm font-bold">{tokens}</span>
          </div>

          {/* Vidas y reloj (Modo Vidas o Reto de rescate diario) */}
          {showLivesAndTimer && (
            <>
              <div
                className="flex items-center gap-0.5"
                aria-label={`Vidas restantes: ${lives} de ${maxLives}`}
                data-testid="lives-display"
              >
                {Array.from({ length: maxLives }, (_, idx) => {
                  const full = idx < lives;
                  return (
                    <svg
                      key={idx}
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        className={
                          full
                            ? 'fill-red-600 stroke-red-700 dark:fill-rose-500 dark:stroke-rose-400'
                            : 'fill-transparent stroke-zinc-300 dark:stroke-slate-700'
                        }
                        strokeWidth="1.8"
                      />
                    </svg>
                  );
                })}
              </div>

              <span
                data-testid="timer-display"
                className="font-mono-tabular text-xs font-semibold text-zinc-700 dark:text-slate-200 sm:text-sm"
              >
                {formatTime(elapsedSeconds)}
              </span>
            </>
          )}

          {/* Racha paralela sin morir en Modo Vidas */}
          {mode === 'lives' && livesStreak > 0 && (
            <div
              className="hidden items-center gap-0.5 text-orange-700 dark:text-orange-400 sm:flex"
              title="Racha paralela sin morir (bonifica puntuación)"
              data-testid="lives-streak-display"
            >
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono-tabular text-sm font-bold">{livesStreak}</span>
            </div>
          )}

          {/* Racha diaria en Modo Diario */}
          {mode === 'daily' && (dailyStreak > 0 || isRecoveryRun) && (
            <div
              className="hidden items-center gap-0.5 text-teal-800 dark:text-teal-300 sm:flex"
              title={isRecoveryRun ? 'Reto de rescate de racha diaria' : 'Racha diaria'}
            >
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono-tabular text-sm font-bold">
                {isRecoveryRun ? 'Rescate' : dailyStreak}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fila 2: Controles de partida y accesibilidad */}
      <div className="flex items-center justify-between gap-1.5 border-y border-zinc-300/80 py-1.5 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onUndo();
            }}
            disabled={!canUndo}
            aria-label="Deshacer movimiento"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-300/90 bg-white px-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:px-2.5 whitespace-nowrap shrink-0"
          >
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReset();
            }}
            disabled={!canUndo}
            aria-label="Reiniciar nivel actual"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-300/90 bg-white px-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:px-2.5 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>

          {canGenerateNew && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onNewLevel();
              }}
              aria-label="Generar nuevo tablero"
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Nuevo</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            title={muted ? 'Activar sonido (M)' : 'Silenciar sonido (M)'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300/90 bg-white text-zinc-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shrink-0"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleReducedMotion();
            }}
            aria-label={reducedMotion ? 'Activar animaciones' : 'Reducir animaciones'}
            title={reducedMotion ? 'Animaciones reducidas (activar)' : 'Reducir animaciones'}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors shrink-0 ${
              reducedMotion
                ? 'border-teal-700/40 bg-teal-50 text-teal-800 dark:border-teal-400/40 dark:bg-teal-950/40 dark:text-teal-300'
                : 'border-zinc-300/90 bg-white text-zinc-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {reducedMotion ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleTheme();
            }}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300/90 bg-white text-zinc-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pausar juego"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300/90 bg-white text-zinc-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shrink-0"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
