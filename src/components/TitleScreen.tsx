// ============================================================================
// PANTALLA DE INICIO (GAME SHELL RETRO-MODERNO)
// Permite elegir entre Academia (Tutorial), Modo Zen, Modo Vidas y Nivel Diario
// (con racha local y rescate escalonado sin anuncios), además de accesibilidad.
// ============================================================================

import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  Flame,
  Heart,
  Infinity as InfinityIcon,
  Moon,
  Play,
  ShieldAlert,
  Sun,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
} from 'lucide-react';
import { ACADEMY_LESSONS } from '../game/academy';
import type { GameMode, GridSize, PlayerProgress, ThemeMode } from '../game/types';

interface TitleScreenProps {
  selectedMode: GameMode;
  selectedSize: GridSize;
  selectedAcademyIdx: number;
  todayKey: string;
  theme: ThemeMode;
  muted: boolean;
  reducedMotion: boolean;
  progress: PlayerProgress;
  onSelectMode: (mode: GameMode) => void;
  onSelectSize: (size: GridSize) => void;
  onSelectAcademyIdx: (idx: number) => void;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onToggleReducedMotion: () => void;
  onStartGame: () => void;
  onStartDailyRecovery: () => void;
}

const SIZES: GridSize[] = [5, 6, 7, 8];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  selectedSize,
  selectedAcademyIdx,
  todayKey,
  theme,
  muted,
  reducedMotion,
  progress,
  onSelectMode,
  onSelectSize,
  onSelectAcademyIdx,
  onToggleTheme,
  onToggleMute,
  onToggleReducedMotion,
  onStartGame,
  onStartDailyRecovery,
}) => {
  // Muestra interactiva 3×3 en la pantalla de título (incluye 0 exterior, Bandera, X y ?)
  const [sampleMarks, setSampleMarks] = useState<('empty' | 'safe' | 'flag' | 'question')[][]>([
    ['flag', 'question', 'safe'],
    ['safe', 'empty', 'safe'],
    ['empty', 'empty', 'safe'],
  ]);

  const cycleSampleCell = (r: number, c: number) => {
    if (r === 1 && c === 1) return; // Pista fija "2"
    const order: ('empty' | 'safe' | 'flag' | 'question')[] = ['empty', 'safe', 'flag', 'question'];
    setSampleMarks((prev) =>
      prev.map((row, ri) =>
        row.map((val, ci) => {
          if (ri !== r || ci !== c) return val;
          return order[(order.indexOf(val) + 1) % order.length];
        })
      )
    );
  };

  const dailyDoneToday = progress.daily.completedDates.includes(todayKey);
  const recovery = progress.daily.recoveryChallengePending;

  const startLabel =
    selectedMode === 'academy'
      ? `Jugar: ${ACADEMY_LESSONS[selectedAcademyIdx]?.title ?? 'Academia'}`
      : selectedMode === 'zen'
      ? `Jugar Zen · Nivel ${progress.zenLevel} (${selectedSize}×${selectedSize})`
      : selectedMode === 'lives'
      ? `Jugar Vidas · Nivel ${progress.livesLevel} (${selectedSize}×${selectedSize})`
      : dailyDoneToday
      ? `Rejugar Diario (${todayKey})`
      : `Jugar Diario (${todayKey})`;

  return (
    <main className="relative flex min-h-full w-full flex-col justify-between overflow-x-hidden px-4 py-4 sm:px-8 sm:py-6">
      {/* Barra superior minimalista de estado local y accesibilidad */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-slate-300">
          <span className="font-mono-tabular font-bold text-amber-800 dark:text-amber-300">
            ◈ {progress.tokens} fichas
          </span>
          <span aria-hidden="true" className="text-zinc-300 dark:text-slate-700">
            ·
          </span>
          <span className="font-mono-tabular font-semibold">
            {progress.scoreTotal} pts
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            title={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300/90 bg-white/90 text-zinc-700 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleReducedMotion}
            aria-label={reducedMotion ? 'Activar animaciones' : 'Reducir animaciones'}
            title={reducedMotion ? 'Animaciones reducidas' : 'Reducir animaciones'}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              reducedMotion
                ? 'border-teal-700/40 bg-teal-50 text-teal-800 dark:border-teal-400/40 dark:bg-teal-950/40 dark:text-teal-300'
                : 'border-zinc-300/90 bg-white/90 text-zinc-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {reducedMotion ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">
              {reducedMotion ? 'Sin anim.' : 'Animaciones'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300/90 bg-white/90 px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-zinc-700" />
                <span>Oscuro</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Escenario principal en 2 columnas limpias */}
      <div className="mx-auto my-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 py-5 lg:grid-cols-12 lg:gap-10">
        {/* Columna izquierda: Emblema + 4 Modos + Configuración + CTA */}
        <section className="flex flex-col items-start gap-5 lg:col-span-7">
          <div className="flex items-center gap-3.5">
            <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden="true">
              <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="10"
                className="fill-white stroke-zinc-300 dark:fill-slate-800 dark:stroke-slate-700"
                strokeWidth="2"
              />
              <line
                x1="24"
                y1="6"
                x2="24"
                y2="42"
                className="stroke-zinc-200 dark:stroke-slate-700"
                strokeWidth="1.5"
              />
              <line
                x1="6"
                y1="24"
                x2="42"
                y2="24"
                className="stroke-zinc-200 dark:stroke-slate-700"
                strokeWidth="1.5"
              />
              <path
                d="M11 19V9l8 3.5-8 3.5"
                className="fill-red-600 stroke-red-600 dark:fill-rose-400 dark:stroke-rose-400"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="M30 11l6 6m0-6l-6 6"
                className="stroke-teal-700 dark:stroke-teal-400"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <text
                x="15"
                y="37"
                textAnchor="middle"
                className="fill-zinc-900 dark:fill-slate-100"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '12px' }}
              >
                0
              </text>
              <text
                x="33"
                y="37"
                textAnchor="middle"
                className="fill-indigo-700 dark:fill-indigo-300"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '12px' }}
              >
                ?
              </text>
            </svg>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-slate-50 sm:text-5xl">
                Minedoku
              </h1>
              <p className="text-sm text-zinc-600 dark:text-slate-400">
                Buscaminas × Nonograma · Solución única verificada
              </p>
            </div>
          </div>

          {/* Selector de los 4 Modos de Juego */}
          <div className="w-full">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-slate-400">
              Elige modo de juego
            </span>
            <div
              role="group"
              aria-label="Selector de modo de juego"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              <button
                type="button"
                onClick={() => onSelectMode('academy')}
                aria-pressed={selectedMode === 'academy'}
                className={`retro-panel flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  selectedMode === 'academy'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-teal-400 dark:bg-teal-500/20 dark:text-slate-50'
                    : 'border-zinc-300/90 bg-white text-zinc-800 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-bold">Academia</span>
                <span className="font-mono-tabular text-[11px] opacity-75">
                  {progress.completedAcademyIds.length}/{ACADEMY_LESSONS.length} lecciones
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('zen')}
                aria-pressed={selectedMode === 'zen'}
                className={`retro-panel flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  selectedMode === 'zen'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-teal-400 dark:bg-teal-500/20 dark:text-slate-50'
                    : 'border-zinc-300/90 bg-white text-zinc-800 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <InfinityIcon className="h-4 w-4" />
                <span className="text-sm font-bold">Modo Zen</span>
                <span className="font-mono-tabular text-[11px] opacity-75">
                  Nivel {progress.zenLevel} · Libre
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('lives')}
                aria-pressed={selectedMode === 'lives'}
                className={`retro-panel flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  selectedMode === 'lives'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-teal-400 dark:bg-teal-500/20 dark:text-slate-50'
                    : 'border-zinc-300/90 bg-white text-zinc-800 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span className="text-sm font-bold">Modo Vidas</span>
                <span className="font-mono-tabular text-[11px] opacity-75">
                  Racha: {progress.livesStreak} (máx {progress.bestLivesStreak})
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('daily')}
                aria-pressed={selectedMode === 'daily'}
                className={`retro-panel flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  selectedMode === 'daily'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-teal-400 dark:bg-teal-500/20 dark:text-slate-50'
                    : 'border-zinc-300/90 bg-white text-zinc-800 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-bold">Diario</span>
                <span className="font-mono-tabular text-[11px] opacity-75">
                  Racha: {progress.daily.currentStreak}d
                </span>
              </button>
            </div>
          </div>

          {/* Opciones contextuales según el modo seleccionado */}
          {selectedMode === 'academy' && (
            <div className="w-full rounded-xl border border-zinc-300/80 bg-white/85 p-3.5 dark:border-slate-800 dark:bg-slate-900/75">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-slate-400">
                <span>4 niveles guiados + 2 práctica libre sin guía</span>
                <span>Pista gratis en guiados</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ACADEMY_LESSONS.map((lesson, idx) => {
                  const done = progress.completedAcademyIds.includes(lesson.id);
                  const active = selectedAcademyIdx === idx;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => onSelectAcademyIdx(idx)}
                      aria-pressed={active}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                        active
                          ? 'border-teal-700 bg-teal-50 font-semibold text-teal-950 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-100'
                          : 'border-zinc-200 bg-stone-50/70 text-zinc-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{lesson.title}</span>
                      <span className="flex items-center gap-1 shrink-0 font-mono-tabular text-[10px] opacity-80">
                        {done && <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />}
                        {lesson.guided ? 'Guía' : 'Libre'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(selectedMode === 'zen' || selectedMode === 'lives') && (
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-slate-400">
                <span className="font-semibold">Tamaño del tablero</span>
                <span>
                  {selectedMode === 'zen'
                    ? 'Sin reloj ni vidas'
                    : '3 vidas · Racha sin morir multiplica puntos'}
                </span>
              </div>
              <div
                role="group"
                aria-label="Selector de tamaño"
                className="grid grid-cols-4 gap-1.5 rounded-xl border border-zinc-300/80 bg-stone-200/70 p-1 dark:border-slate-700/80 dark:bg-slate-900/70"
              >
                {SIZES.map((s) => {
                  const active = selectedSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSelectSize(s)}
                      aria-pressed={active}
                      className={`font-mono-tabular h-10 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-white text-zinc-900 shadow-xs dark:bg-slate-700 dark:text-white'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      {s}×{s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedMode === 'daily' && (
            <div className="flex w-full flex-col gap-2.5 rounded-xl border border-zinc-300/80 bg-white/85 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/75">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-slate-100">
                  <Flame className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  <span>
                    Racha diaria: {progress.daily.currentStreak} día
                    {progress.daily.currentStreak === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="font-mono-tabular text-zinc-500 dark:text-slate-400">
                  Récord: {progress.daily.bestStreak}d · {dailyDoneToday ? 'Completado hoy' : 'Pendiente hoy'}
                </span>
              </div>
              <p className="text-zinc-600 dark:text-slate-300">
                Tablero determinista para <strong>{todayKey}</strong>. Si pierdes un día, puedes
                rescatar tu racha sin anuncios superando un reto (1 intento en racha corta, 3 en
                normal, 5 en racha alta).
              </p>

              {recovery && (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-500/45 bg-amber-50/90 p-2.5 dark:border-amber-400/35 dark:bg-amber-950/35">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>
                      Rescate disponible para {recovery.missedDate} · {recovery.tierLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onStartDailyRecovery}
                    className="h-9 self-start rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-slate-950"
                  >
                    Rescatar racha ({recovery.remainingAttempts}/{recovery.maxAttempts} intentos)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Botón principal de inicio */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              data-start="true"
              onClick={onStartGame}
              className="retro-panel inline-flex h-12 items-center gap-2.5 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98] hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 sm:text-base whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{startLabel}</span>
            </button>
          </div>
        </section>

        {/* Columna derecha: Tablero interactivo de muestra (0 exterior, interior, Bandera, X, ?) */}
        <section
          aria-label="Tablero interactivo de muestra"
          className="flex flex-col items-center justify-center lg:col-span-5"
        >
          <div className="retro-panel w-full max-w-[320px] rounded-2xl border border-zinc-300/90 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/85">
            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500 dark:text-slate-400">
              <span>Prueba las marcas</span>
              <span className="font-mono-tabular">2 minas</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="flex aspect-square items-center justify-center" />
              {[1, 1, 0].map((clue, cIdx) => (
                <div
                  key={`sc-${cIdx}`}
                  className={`font-mono-tabular flex aspect-square items-center justify-center text-base font-bold ${
                    clue === 0
                      ? 'text-teal-700 dark:text-teal-300'
                      : 'text-zinc-800 dark:text-slate-200'
                  }`}
                >
                  {clue}
                </div>
              ))}

              {[1, 0, 1].map((rowClue, rIdx) => (
                <React.Fragment key={`sr-${rIdx}`}>
                  <div
                    className={`font-mono-tabular flex aspect-square items-center justify-center text-base font-bold ${
                      rowClue === 0
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-zinc-800 dark:text-slate-200'
                    }`}
                  >
                    {rowClue}
                  </div>
                  {[0, 1, 2].map((cIdx) => {
                    if (rIdx === 1 && cIdx === 1) {
                      return (
                        <div
                          key={`s-${rIdx}-${cIdx}`}
                          className="font-mono-tabular flex aspect-square items-center justify-center rounded-lg border border-zinc-200 bg-stone-100 text-lg font-bold text-zinc-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          2
                        </div>
                      );
                    }
                    const mark = sampleMarks[rIdx][cIdx];
                    return (
                      <button
                        key={`s-${rIdx}-${cIdx}`}
                        type="button"
                        onClick={() => cycleSampleCell(rIdx, cIdx)}
                        aria-label={`Casilla muestra fila ${rIdx + 1} columna ${cIdx + 1}`}
                        className="flex aspect-square items-center justify-center rounded-lg border border-zinc-300 bg-white transition-transform active:scale-95 hover:border-zinc-400 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-slate-500"
                      >
                        {mark === 'flag' && (
                          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
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
                          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                            <path
                              d="M7 7l10 10M17 7L7 17"
                              className="stroke-teal-700 dark:stroke-teal-400"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                        {mark === 'question' && (
                          <span className="font-mono-tabular text-base font-bold text-indigo-700 dark:text-indigo-300">
                            ?
                          </span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-1 border-t border-zinc-200/80 pt-3 text-[11px] text-zinc-500 dark:border-slate-800 dark:text-slate-400">
              <span>Toca cualquier casilla para rotar X · Bandera · ?</span>
              <span>? es solo visual: nunca resta vidas ni cuenta como mina.</span>
            </div>
          </div>
        </section>
      </div>

      {/* Línea única de controles */}
      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-zinc-500 dark:text-slate-400">
        Barra inferior: Bandera [1] · X [2] · Duda ? [3] · Pista [H] · Escáner [4] · Clic der.: Bandera · Enter: Jugar
      </footer>
    </main>
  );
};
