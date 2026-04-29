import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  return (
    <div className="relative group inline-flex">
      <button
        onClick={toggle}
        className={`btn-ghost btn-sm text-text3 hover:text-text ${className}`}
        aria-label={label}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <span className="ui-tooltip">{label}</span>
    </div>
  );
}
