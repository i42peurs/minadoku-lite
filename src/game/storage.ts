// ============================================================================
// PERSISTENCIA LOCAL (localStorage)
// Sin cuentas ni backend: guarda tema, sonido, reducir animaciones, fichas,
// niveles de Academia/Zen/Vidas, racha sin morir y racha diaria.
// ============================================================================

import { INITIAL_TOKENS } from './rules';
import type { PlayerProgress, ThemeMode } from './types';

const THEME_KEY = 'minedoku_theme_v2';
const MUTE_KEY = 'minedoku_muted_v2';
const REDUCED_MOTION_KEY = 'minedoku_reduced_motion_v2';
const PROGRESS_KEY = 'minedoku_progress_v2';

export function createDefaultProgress(): PlayerProgress {
  return {
    tokens: INITIAL_TOKENS,
    scoreTotal: 0,
    zenLevel: 1,
    livesLevel: 1,
    livesStreak: 0,
    bestLivesStreak: 0,
    completedAcademyIds: [],
    daily: {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      completedDates: [],
      recoveryChallengePending: null,
    },
    bestTimes: {},
    tokenRewardedDailyDates: [],
  };
}

export function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore
  }
  return 'light';
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function loadReducedMotion(): boolean {
  try {
    const stored = localStorage.getItem(REDUCED_MOTION_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  } catch {
    // ignore
  }
  return false;
}

export function saveReducedMotion(reduced: boolean): void {
  try {
    localStorage.setItem(REDUCED_MOTION_KEY, reduced ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function loadProgress(): PlayerProgress {
  const defaults = createDefaultProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...defaults,
      ...parsed,
      daily: {
        ...defaults.daily,
        ...(parsed.daily ?? {}),
      },
      completedAcademyIds: Array.isArray(parsed.completedAcademyIds)
        ? parsed.completedAcademyIds
        : [],
      bestTimes:
        parsed.bestTimes && typeof parsed.bestTimes === 'object' ? parsed.bestTimes : {},
      tokenRewardedDailyDates: Array.isArray(parsed.tokenRewardedDailyDates)
        ? parsed.tokenRewardedDailyDates
        : [],
    };
  } catch {
    return defaults;
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}
