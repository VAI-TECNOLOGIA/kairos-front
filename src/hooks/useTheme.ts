import { useEffect, useReducer } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kairos-theme';

// ── Module-level singleton — shared across ALL hook instances ──────────
// Theme is stored in localStorage only. The data-theme attribute is applied
// by each authenticated layout on its own root div — public pages (login etc.)
// are never affected by the theme preference.
let _theme: Theme = (() => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  return (saved === 'light' || saved === 'dark') ? saved : 'dark';
})();

const _listeners = new Set<() => void>();

function _setTheme(theme: Theme) {
  _theme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  _listeners.forEach(fn => fn());
}

// ── Hook ───────────────────────────────────────────────────────────────
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    _listeners.add(forceUpdate);
    return () => { _listeners.delete(forceUpdate); };
  }, []);

  return {
    theme   : _theme,
    toggle  : () => _setTheme(_theme === 'dark' ? 'light' : 'dark'),
    setTheme: _setTheme,
  };
}

export function logoForTheme(theme: Theme): string {
  return theme === 'light' ? '/kairosLogo2.png' : '/kairosLogoWhite.png';
}
