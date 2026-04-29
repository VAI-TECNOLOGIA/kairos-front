import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kairos-theme';

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

// Aplica imediatamente na primeira carga (evita flash)
if (typeof document !== 'undefined') {
  applyTheme(readInitial());
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState,
    toggle  : () => setThemeState(t => (t === 'dark' ? 'light' : 'dark')),
  };
}

/** Path da logo correta de acordo com o tema atual.
 *  Tema escuro (default) usa kairosLogo.png (logo branca).
 *  Tema claro usa kairosLogo2.png (logo escura — pra contraste). */
export function logoForTheme(theme: Theme): string {
  return theme === 'light' ? '/kairosLogo2.png' : '/kairosLogo.png';
}
