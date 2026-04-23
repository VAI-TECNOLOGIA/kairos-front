import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, Tag, ShoppingCart, Link2,
  Handshake, Monitor, DollarSign, Settings, LogOut, SlidersHorizontal, Trophy, RotateCcw, Activity, Truck, Tv2, Plug, UserCircle,
  Menu, X,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

const nav = [
  { group: 'Início', items: [
    { to: 'dashboard',    icon: LayoutDashboard, label: 'Meu Painel' },
  ]},
  { group: 'Produtos', items: [
    { to: 'produtos',     icon: Package, label: 'Produtos' },
    { to: 'ofertas',      icon: Tag,     label: 'Ofertas & Split' },
  ]},
  { group: 'Financeiro', items: [
    { to: 'vendas',       icon: ShoppingCart, label: 'Vendas' },
    { to: 'financeiro',   icon: DollarSign,   label: 'Financeiro' },
    { to: 'reembolsos',   icon: RotateCcw,    label: 'Reembolsos' },
    { to: 'marcos',       icon: Trophy,       label: 'Marcos & Conquistas' },
  ]},
  { group: 'Parcerias', items: [
    { to: 'afiliados',    icon: Link2,     label: 'Afiliados' },
    { to: 'coprodutores', icon: Handshake, label: 'Produtores' },
  ]},
  { group: 'Loja', items: [
    { to: 'checkout',   icon: Monitor,   label: 'Checkout' },
    { to: 'tracking',   icon: Activity,  label: 'Pixels de Rastreamento' },
    { to: 'logistica',  icon: Truck,     label: 'Logística & Envios' },
  ]},
  { group: 'Conta', items: [
    { to: 'perfil',               icon: UserCircle,        label: 'Perfil' },
    { to: 'integracoes',          icon: Plug,              label: 'Integrações' },
    { to: 'configurar-dashboard', icon: SlidersHorizontal, label: 'Configurar Dashboard' },
    { to: 'configuracoes',        icon: Settings,          label: 'Configurações' },
  ]},
];

export default function ProducerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSessionTimeout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col bg-bg2 border-r border-border overflow-y-auto transform transition-transform md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <img src="/kairosLogo.png" alt="Kairos Way" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-text">KAIROS WAY</div>
            <div className="text-[10px] text-text3">Painel Produtor</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          {nav.map((section) => (
            <div key={section.group}>
              <div className="sidebar-group">{section.group}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={`/produtor/${item.to}`}
                  className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Botão TV — abre nova aba */}
          <div className="mt-1">
            <div className="sidebar-group">Exibição</div>
            <button
              onClick={() => window.open('/tv', '_blank')}
              className="sidebar-item w-full text-left"
            >
              <Tv2 size={16} />
              <span>Dashboard TV</span>
            </button>
          </div>
        </nav>

      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="session-bar-container">
          <div
            className="session-bar-fill"
            style={{
              width: `${session.pct}%`,
              background: session.danger ? '#FF4D6D' : session.warning ? '#F59E0B' : '#00C9A7',
            }}
          />
        </div>

        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              className="md:hidden p-1.5 rounded-md text-text2 hover:bg-bg3"
              aria-label="Menu"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {(user as any)?.avatarUrl ? (
              <img src={(user as any).avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-8 h-8 bg-green/20 rounded-full flex items-center justify-center text-green text-sm font-bold flex-shrink-0">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-text leading-tight">{user?.name}</div>
              <div className="text-[10px] text-text3">Produtor</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              session.warning ? 'bg-amber/10 text-amber border-amber/20' : 'bg-bg3 text-text3 border-border'
            )}>⏱ {session.label}</span>
            <NotificationBell />
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-ghost btn-sm text-text3 hover:text-red">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}