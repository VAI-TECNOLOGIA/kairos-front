import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '@/stores/auth.store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, Tag, ShoppingCart, Link2,
  Handshake, Monitor, DollarSign, Settings, LogOut, SlidersHorizontal, Trophy, RotateCcw, Activity, Truck, Tv2, Plug, UserCircle,
  Menu, X, HelpCircle, ShieldCheck, Store, Network,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import KycBanner from '@/components/KycBanner';
import { SpecialMessageDialog } from '@/components/SpecialMessageDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme, logoForTheme } from '@/hooks/useTheme';
import TierBadge from '@/components/TierBadge';

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
    { to: 'afiliados',          icon: Link2,     label: 'Afiliados' },
    { to: 'coprodutores',       icon: Handshake, label: 'Co-produtores',       desc: 'Co-produtores dos seus produtos' },
    { to: 'minhas-coproducoes', icon: Network,   label: 'Minhas Co-produções', desc: 'Produtos onde você é co-produtor' },
  ]},
  { group: 'Minhas Afiliações', items: [
    { to: 'marketplace-afiliacao', icon: Store, label: 'Marketplace' },
    { to: 'minhas-afiliacoes',     icon: Link2, label: 'Meus Links' },
  ]},
  { group: 'Loja', items: [
    { to: 'checkout',   icon: Monitor,   label: 'Checkout' },
    { to: 'tracking',   icon: Activity,  label: 'Pixels de Rastreamento' },
    { to: 'logistica',  icon: Truck,     label: 'Logística & Envios' },
  ]},
  { group: 'Conta', items: [
    { to: 'verificacao',          icon: ShieldCheck,       label: 'Verificação' },
    { to: 'perfil',               icon: UserCircle,        label: 'Perfil' },
    { to: 'integracoes',          icon: Plug,              label: 'Integrações' },
    { to: 'ajuda',                icon: HelpCircle,        label: 'Central de Ajuda' },
    { to: 'configurar-dashboard', icon: SlidersHorizontal, label: 'Configurar Dashboard' },
    { to: 'configuracoes',        icon: Settings,          label: 'Configurações' },
  ]},
];

export default function ProducerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Auto-logout após 15 min de inatividade (PCI REQ-8) — sem UI
  useSessionTimeout();

  return (
    <div data-theme={theme} className="flex h-screen overflow-hidden bg-bg">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col bg-bg2 border-r border-border overflow-y-auto transform transition-transform",
        Capacitor.isNativePlatform() ? "" : "md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <img src={logoForTheme(theme)} alt="Kairos Way" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-text">KAIROS WAY</div>
            <div className="text-[10px] text-text3">Painel Produtor</div>
          </div>
        </div>

        {/* Barra de progressão de nível (Bronze/Prata/Ouro) — antes só existia no painel afiliado */}
        <TierBadge />

        <nav className="flex-1 px-3 py-4">
          {nav.map((section) => (
            <div key={section.group}>
              <div className="sidebar-group">{section.group}</div>
              {section.items.map((item: any) => (
                <NavLink
                  key={item.to}
                  to={`/produtor/${item.to}`}
                  className={({ isActive }) => cn('sidebar-item', isActive && 'active', item.desc && 'items-start')}
                >
                  <item.icon size={16} className={item.desc ? 'mt-0.5 flex-shrink-0' : ''} />
                  <span className="flex-1 min-w-0">
                    <span className="block">{item.label}</span>
                    {item.desc && <span className="block text-[10px] text-text3 leading-tight mt-0.5">{item.desc}</span>}
                  </span>
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
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              className={cn("p-1.5 rounded-md text-text2 hover:bg-bg3", Capacitor.isNativePlatform() ? "" : "md:hidden")}
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
            <ThemeToggle />
            <NotificationBell />
            <div className="relative group inline-flex">
              <button onClick={() => { logout(); navigate('/login'); }} className="btn-ghost btn-sm text-text3 hover:text-red" aria-label="Sair">
                <LogOut size={15} />
              </button>
              <span className="ui-tooltip">Sair</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 animate-fade-in">
          <KycBanner />
          <Outlet />
        </main>
      </div>
      <SpecialMessageDialog />
    </div>
  );
}
