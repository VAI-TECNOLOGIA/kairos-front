import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { ShoppingBag, Store, LogOut, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme, logoForTheme } from '@/hooks/useTheme';

export default function CustomerLayout() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/cliente/login');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Topbar */}
      <header className="bg-bg2 border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <NavLink to="/cliente/marketplace" className="flex items-center gap-2.5 flex-shrink-0">
            <img src={logoForTheme(theme)} alt="Kairos Way" className="w-7 h-7 rounded-md object-contain" />
            <span className="text-sm font-bold text-text">KAIROS WAY</span>
          </NavLink>

          {/* Nav central */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/cliente/marketplace"
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-sm transition-colors',
                isActive ? 'bg-accent/10 text-accent font-medium' : 'text-text2 hover:text-text hover:bg-bg3'
              )}
            >
              <Store size={15} />
              Marketplace
            </NavLink>

            {isAuthenticated() && (
              <NavLink
                to="/cliente/compras"
                className={({ isActive }) => cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-sm transition-colors',
                  isActive ? 'bg-accent/10 text-accent font-medium' : 'text-text2 hover:text-text hover:bg-bg3'
                )}
              >
                <ShoppingBag size={15} />
                Minhas compras
              </NavLink>
            )}
          </nav>

          {/* Usuário / Login */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            {isAuthenticated() ? (
              <>
                <NotificationBell />
                <div className="hidden sm:flex items-center gap-2 text-sm text-text2">
                  <div className="w-7 h-7 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold">
                    {user?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-text">{user?.name?.split(' ')[0]}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-xs text-text3 hover:text-red hover:bg-red/5 transition-colors"
                >
                  <LogOut size={13} />
                  Sair
                </button>
              </>
            ) : (
              <NavLink
                to="/cliente/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-accent text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <UserCircle size={14} />
                Entrar
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 animate-fade-in">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-text3">
        © {new Date().getFullYear()} Kairos Way · Gateway de Pagamentos
      </footer>
    </div>
  );
}
