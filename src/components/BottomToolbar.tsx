// ============================================================================
// BARRA INFERIOR CÓMODA PARA TÁCTIL Y RATÓN
// Permite alternar entre Bandera (mina), X (segura), ? (duda), Pista didáctica
// y Escáner / Revelar con atajos visibles en teclado de PC.
// ============================================================================

import React from 'react';
import { Flag, HelpCircle, Lightbulb, ScanSearch, X } from 'lucide-react';
import { HINT_COST_TOKENS, SCANNER_COST_TOKENS } from '../game/rules';
import type { InputTool } from '../game/types';

interface BottomToolbarProps {
  activeTool: InputTool;
  tokens: number;
  hintIsFree: boolean;
  disabled: boolean;
  onSelectTool: (tool: InputTool) => void;
  onRequestHint: () => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  activeTool,
  tokens,
  hintIsFree,
  disabled,
  onSelectTool,
  onRequestHint,
}) => {
  const canAffordHint = hintIsFree || tokens >= HINT_COST_TOKENS;
  const canAffordScanner = tokens >= SCANNER_COST_TOKENS;

  return (
    <nav
      aria-label="Herramientas de marcado y ayudas"
      className="mx-auto w-full max-w-2xl px-2.5 pb-3 pt-1 sm:px-4 sm:pb-4"
    >
      <div className="retro-panel grid grid-cols-5 gap-1.5 rounded-xl border border-zinc-300/90 bg-white/95 p-1.5 dark:border-slate-700/90 dark:bg-slate-900/95">
        {/* Herramienta 1: Bandera (mina) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectTool('flag')}
          aria-pressed={activeTool === 'flag'}
          aria-label="Herramienta Bandera (mina), atajo 1"
          className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            activeTool === 'flag'
              ? 'bg-red-600 text-white dark:bg-rose-500 dark:text-slate-950'
              : 'text-zinc-700 hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1">
            <Flag className="h-4 w-4 shrink-0" />
            <span className="hidden font-mono-tabular text-[10px] opacity-75 sm:inline">[1]</span>
          </div>
          <span>Bandera</span>
        </button>

        {/* Herramienta 2: X (casilla segura) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectTool('safe')}
          aria-pressed={activeTool === 'safe'}
          aria-label="Herramienta X segura, atajo 2"
          className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            activeTool === 'safe'
              ? 'bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-950'
              : 'text-zinc-700 hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1">
            <X className="h-4 w-4 shrink-0 stroke-[2.6]" />
            <span className="hidden font-mono-tabular text-[10px] opacity-75 sm:inline">[2]</span>
          </div>
          <span>Segura X</span>
        </button>

        {/* Herramienta 3: Interrogación (?) - visual sin penalización */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectTool('question')}
          aria-pressed={activeTool === 'question'}
          aria-label="Herramienta Duda interrogación, atajo 3"
          className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            activeTool === 'question'
              ? 'bg-indigo-600 text-white dark:bg-indigo-400 dark:text-slate-950'
              : 'text-zinc-700 hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className="hidden font-mono-tabular text-[10px] opacity-75 sm:inline">[3]</span>
          </div>
          <span>Duda ?</span>
        </button>

        {/* Ayuda 1: Pista didáctica */}
        <button
          type="button"
          disabled={disabled || !canAffordHint}
          onClick={onRequestHint}
          aria-label={`Pedir pista didáctica (${hintIsFree ? 'gratis' : `${HINT_COST_TOKENS} ficha`}), atajo H`}
          className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-500/35 bg-amber-50/90 px-1 py-1.5 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-amber-400/30 dark:bg-amber-950/35 dark:text-amber-200 dark:hover:bg-amber-950/60 whitespace-nowrap"
        >
          <div className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4 shrink-0" />
            <span className="font-mono-tabular text-[10px]">
              {hintIsFree ? 'Gratis' : `${HINT_COST_TOKENS}◈`}
            </span>
          </div>
          <span>Pista</span>
        </button>

        {/* Ayuda 2: Escáner / Revelar casilla elegida */}
        <button
          type="button"
          disabled={disabled || (!canAffordScanner && activeTool !== 'scanner')}
          onClick={() => onSelectTool(activeTool === 'scanner' ? 'safe' : 'scanner')}
          aria-pressed={activeTool === 'scanner'}
          aria-label={`Modo Escáner revelar casilla (${SCANNER_COST_TOKENS} fichas), atajo 4`}
          className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap ${
            activeTool === 'scanner'
              ? 'bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-950'
              : 'border border-sky-600/30 bg-sky-50/80 text-sky-900 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-950/35 dark:text-sky-200 dark:hover:bg-sky-950/60'
          }`}
        >
          <div className="flex items-center gap-1">
            <ScanSearch className="h-4 w-4 shrink-0" />
            <span className="font-mono-tabular text-[10px]">{SCANNER_COST_TOKENS}◈</span>
          </div>
          <span>Escáner</span>
        </button>
      </div>
    </nav>
  );
};
