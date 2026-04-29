import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`btn-ghost btn-sm text-text3 hover:text-text ${className}`}
      title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
