import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Package, Tag, ShoppingCart, Link2, Handshake,
  RefreshCw, DollarSign, BarChart3, Shield,
  Settings, LogOut, Bell, Activity, FlaskConical, UserCircle
} from 'lucide-react';

const nav = [
  { group: 'Visão Geral', items: [
    { to: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { group: 'Produtores', items: [
    { to: 'produtores',   icon: Users,     label: 'Produtores' },
    { to: 'produtos',     icon: Package,   label: 'Produtos' },
    { to: 'ofertas',      icon: Tag,       label: 'Ofertas & Split' },
  ]},
  { group: 'Financeiro', items: [
    { to: 'vendas',       icon: ShoppingCart, label: 'Vendas' },
    { to: 'assinaturas',  icon: RefreshCw,    label: 'Assinaturas' },
    { to: 'financeiro',   icon: DollarSign,   label: 'Financeiro' },
    { to: 'relatorios',   icon: BarChart3,    label: 'Relatórios' },
  ]},
  { group: 'Parcerias', items: [
    { to: 'afiliados',    icon: Link2,      label: 'Afiliados' },
    { to: 'coprodutores', icon: Handshake,  label: 'Co-Produtores' },
  ]},
  { group: 'Segurança', items: [
    { to: 'audit-log',    icon: Activity, label: 'Audit Log' },
    { to: 'seguranca',    icon: Shield,   label: 'PCI & Segurança' },
  ]},
  { group: 'Sistema', items: [
    { to: 'perfil',            icon: UserCircle,   label: 'Meu Perfil' },
    { to: 'configuracoes',     icon: Settings,     label: 'Configurações' },
    { to: 'ambiente-de-teste', icon: FlaskConical, label: 'Ambiente de Teste', badge: 'beta' },
  ]},
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const session = useSessionTimeout();

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
        <nav className="flex-1 px-3 py-4">
          {nav.map((section) => (
            <div key={section.group}>
              <div className="sidebar-group">{section.group}</div>
              {section.items.map((item) => (
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
              ))}
            </div>
          ))}
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