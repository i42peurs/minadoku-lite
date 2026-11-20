// ============================================================================
// BOTÓN DE INSTALACIÓN EN PANTALLA DE INICIO (PWA + GUÍA iOS SAFARI)
// Solo aparece cuando la app no está instalada todavía y ofrece instalación
// directa en Android/Chromium o instrucciones claras en iOS Safari.
// ============================================================================

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        aria-label="Instalar Minadoku Lite en la pantalla de inicio"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-700/35 bg-teal-50 px-2.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100 dark:border-teal-400/35 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-950 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Instalar</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Añadir Minadoku Lite a la pantalla de inicio en iOS"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-700/35 bg-teal-50 px-2.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100 dark:border-teal-400/35 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-950 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instalar</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4"
          >
            <div className="retro-panel w-full max-w-sm rounded-2xl border border-zinc-300 bg-[#f3f1ea] p-5 shadow-xl dark:border-slate-700 dark:bg-[#171b23]">
              <h2
                id="ios-install-title"
                className="font-display text-lg font-bold text-zinc-900 dark:text-slate-50"
              >
                Añadir Minadoku Lite al inicio
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-slate-300">
                <li>
                  Pulsa el botón <strong>Compartir</strong> en la barra de Safari.
                </li>
                <li>
                  Elige <strong>Añadir a pantalla de inicio</strong>.
                </li>
                <li>
                  Confirma el nombre sugerido <strong>Minadoku Lite</strong> y pulsa{' '}
                  <strong>Añadir</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 h-10 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-teal-500 dark:text-slate-950"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
