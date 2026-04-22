import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Package, Tag, ShoppingCart, Link2, Handshake,
  RefreshCw, DollarSign, BarChart3, Shield, Truck,
  Settings, LogOut, Bell, Activity, FlaskConical, UserCircle, SlidersHorizontal, Tv2,
  ChevronDown, Megaphone, Briefcase, Lock, Percent, MessageSquareHeart, Plug, Clock,
} from 'lucide-react';

type NavItem = {
  to    : string;
  icon  : any;
  label : string;
  badge?: string;
  /** Link externo (ex: abre em nova aba) */
  external?: boolean;
};

type NavSection = {
  group     : string;
  icon      : any;
  items     : NavItem[];
  /** Se true, sempre aberto (para grupos com 1 item como "Visão Geral") */
  alwaysOpen?: boolean;
};

const nav: NavSection[] = [
  { group: 'Visão Geral', icon: LayoutDashboard, items: [
    { to: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tv',       icon: Tv2,             label: 'Painel TV', external: true },
  ]},
  { group: 'Produtores', icon: Briefcase, items: [
    { to: 'produtores',   icon: Users,     label: 'Produtores' },
    { to: 'produtos',     icon: Package,   label: 'Produtos' },
    { to: 'ofertas',      icon: Tag,       label: 'Ofertas & Split' },
  ]},
  { group: 'Financeiro', icon: DollarSign, items: [
    { to: 'vendas',       icon: ShoppingCart, label: 'Vendas' },
    { to: 'assinaturas',  icon: RefreshCw,    label: 'Assinaturas' },
    { to: 'financeiro',   icon: DollarSign,   label: 'Financeiro' },
    { to: 'logistica',    icon: Truck,        label: 'Envios' },
    { to: 'relatorios',   icon: BarChart3,    label: 'Relatórios' },
  ]},
  { group: 'Parcerias', icon: Handshake, items: [
    { to: 'afiliados',    icon: Link2,      label: 'Afiliados' },
    { to: 'coprodutores', icon: Handshake,  label: 'Co-Produtores' },
  ]},
  { group: 'Marketing', icon: Megaphone, items: [
    { to: 'tracking',    icon: Activity, label: 'Pixels de Rastreamento' },
  ]},
  { group: 'Segurança', icon: Lock, items: [
    { to: 'audit-log',    icon: Activity, label: 'Audit Log' },
    { to: 'seguranca',    icon: Shield,   label: 'PCI & Segurança' },
  ]},
  { group: 'Sistema', icon: Settings, items: [
    { to: 'perfil',               icon: UserCircle,        label: 'Perfil' },
    { to: 'configurar-dashboard', icon: SlidersHorizontal, label: 'Dashboard' },
    { to: 'taxas',                icon: Percent,           label: 'Taxas' },
    { to: 'prazos-liberacao',     icon: Clock,             label: 'Prazos de Liberação' },
    { to: 'mensagens',            icon: MessageSquareHeart, label: 'Mensagens' },
    { to: 'integracoes',          icon: Plug,              label: 'Integrações' },
    { to: 'ambiente-de-teste',    icon: FlaskConical,      label: 'Ambiente de Teste', badge: 'beta' },
  ]},
];

const STORAGE_KEY = 'admin.sidebar.expanded';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const session  = useSessionTimeout();

  // Expandido por padrão: apenas o grupo cujo item está ativo na rota atual
  const getInitialExpanded = (): Record<string, boolean> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }

    // Fallback: abre "Visão Geral" + grupo da rota atual
    const next: Record<string, boolean> = {};
    for (const section of nav) {
      if (section.alwaysOpen || section.group === 'Visão Geral') {
        next[section.group] = true;
        continue;
      }
      next[section.group] = section.items.some(it => !it.external && location.pathname.includes(`/admin/${it.to}`));
    }
    return next;
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>(getInitialExpanded);

  // Sempre que a rota mudar, garante que o grupo da rota atual esteja aberto
  useEffect(() => {
    setExpanded(prev => {
      const next = { ...prev };
      for (const section of nav) {
        if (section.alwaysOpen) next[section.group] = true;
        else if (section.items.some(it => !it.external && location.pathname.includes(`/admin/${it.to}`))) {
          next[section.group] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

  // Persiste no localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded)); } catch { /* ignore */ }
  }, [expanded]);

  const toggleGroup = (group: string) => {
    setExpanded(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-bg2 border-r border-border overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <img src="/kairosLogo.png" alt="Kairos Way" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-text">KAIROS WAY</div>
            <div className="text-[10px] text-text3">Painel Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {nav.map((section) => {
            const isOpen    = section.alwaysOpen || !!expanded[section.group];
            const hasActive = section.items.some(it => !it.external && location.pathname.includes(`/admin/${it.to}`));
            const GroupIcon = section.icon;

            const renderItem = (item: NavItem) => {
              if (item.external) {
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => window.open(item.to, '_blank')}
                    className="sidebar-item w-full text-left"
                  >
                    <item.icon size={16} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 uppercase tracking-wide">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={`/admin/${item.to}`}
                  className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
                >
                  <item.icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 uppercase tracking-wide">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            };

            return (
              <div key={section.group} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(section.group)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-[7px] text-sm font-semibold transition-colors',
                    hasActive ? 'text-text' : 'text-text2 hover:text-text',
                  )}
                >
                  <GroupIcon size={16} className="opacity-80" />
                  <span className="flex-1 text-left">{section.group}</span>
                  <ChevronDown
                    size={15}
                    className={cn(
                      'transition-transform opacity-60',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 animate-fade-in">
                    {section.items.map(renderItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 p-2 rounded-[7px] hover:bg-bg3 cursor-pointer group">
            {(user as any)?.avatarUrl ? (
              <img src={(user as any).avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border" />
            ) : (
              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm font-bold flex-shrink-0">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">{user?.name}</div>
              <div className="text-xs text-text3">Super Admin</div>
            </div>
            <button onClick={handleLogout} className="p-1 rounded text-text3 hover:text-red opacity-0 group-hover:opacity-100 transition-opacity">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Session bar */}
        <div className="session-bar-container">
          <div
            className="session-bar-fill"
            style={{
              width: `${session.pct}%`,
              background: session.danger ? '#FF4D6D' : session.warning ? '#F59E0B' : '#0055FE',
            }}
          />
        </div>

        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 bg-bg2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/20">
              🔒 TLS 1.3
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              PCI DSS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              title="Sessão expira em (PCI REQ-8)"
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                session.danger  ? 'bg-red/10 text-red border-red/20' :
                session.warning ? 'bg-amber/10 text-amber border-amber/20' :
                'bg-amber/10 text-amber border-amber/20'
              )}
            >
              ⏱ {session.label}
            </span>
            <button className="btn-ghost btn-sm relative">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red rounded-full" />
            </button>
            <button
              onClick={handleLogout}
              className="btn-ghost btn-sm text-text3 hover:text-red"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
