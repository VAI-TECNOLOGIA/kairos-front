import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingBag, Link2, DollarSign,
  LogOut, Bell, UserCircle, Trophy, X, Sparkles, Package,
} from 'lucide-react';

const nav = [
  { group: 'Início', items: [
    { to: 'dashboard',   icon: LayoutDashboard, label: 'Meu Painel' },
    { to: 'ranking',     icon: Trophy,          label: 'Ranking'    },
  ]},
  { group: 'Promoções', items: [
    { to: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { to: 'links',       icon: Link2,       label: 'Meus Links'  },
  ]},
  { group: 'Financeiro', items: [
    { to: 'financeiro',  icon: DollarSign,  label: 'Financeiro'  },
  ]},
  { group: 'Conta', items: [
    { to: 'perfil',      icon: UserCircle,  label: 'Meu Perfil'  },
  ]},
];

const TIER_COLOR: Record<string, string> = {
  Bronze  : '#CD7F32',
  Prata   : '#A8A9AD',
  Ouro    : '#FFD700',
  Diamante: '#7DF9FF',
};

const TIER_BG: Record<string, string> = {
  Bronze  : 'rgba(205,127,50,0.12)',
  Prata   : 'rgba(168,169,173,0.12)',
  Ouro    : 'rgba(255,215,0,0.12)',
  Diamante: 'rgba(125,249,255,0.12)',
};

export default function AffiliateLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const session  = useSessionTimeout();

  const { data: stats } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn : () => api.get('/affiliates/my-stats').then(r => r.data),
    staleTime: 1000 * 60,
  });

  const { data: me } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn : () => api.get('/auth/me').then(r => r.data),
    staleTime: 1000 * 30,
  });

  const dismissWelcome = useMutation({
    mutationFn: () => api.post('/coproducer-requests/dismiss-welcome'),
    onSuccess : () => { window.location.reload(); },
  });

  const showWelcome = me?.showCoproducerWelcome === true;

  const handleDismissWelcome = () => {
    dismissWelcome.mutate();
  };

  const canCreate    = stats?.canCreateProducts || false;
  const tier         = stats?.tier          || 'Bronze';
  const tierProgress = stats?.tierProgress  || 0;
  const tierNextGoal = stats?.tierNextGoal  || null;
  const volumeCents  = stats?.volumeCents   || 0;
  const tierColor    = TIER_COLOR[tier]     || '#CD7F32';
  const tierBg       = TIER_BG[tier]        || 'rgba(205,127,50,0.12)';

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-bg2 border-r border-border overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <img src="/kairosLogo.png" alt="Kairos Way" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-text">KAIROS WAY</div>
            <div className="text-[10px] text-text3">Painel Afiliado</div>
          </div>
        </div>

        {/* Tier badge na sidebar */}
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-[8px] border" style={{ background: tierBg, borderColor: `${tierColor}30` }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy size={12} style={{ color: tierColor }} />
              <span className="text-[11px] font-bold" style={{ color: tierColor }}>{tier}</span>
            </div>
            <span className="text-[10px] text-text3">{tierProgress}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-bg3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${tierProgress}%`, background: tierColor }}
            />
          </div>
          {tierNextGoal && (
            <div className="text-[9px] text-text3 mt-1">
              Próxima meta: {formatBRL(tierNextGoal)}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-2">
          {nav.map((section) => (
            <div key={section.group}>
              <div className="sidebar-group">{section.group}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={`/afiliado/${item.to}`}
                  className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
                >
                  <item.icon size={16} />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          {canCreate && (
            <div>
              <div className="sidebar-group">Co-produtor</div>
              <NavLink
                to="/afiliado/meus-produtos"
                className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
              >
                <Package size={16} />
                <span className="flex-1">Meus Produtos</span>
              </NavLink>
              <NavLink
                to="/afiliado/minhas-ofertas"
                className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
              >
                <ShoppingBag size={16} />
                <span className="flex-1">Minhas Ofertas</span>
              </NavLink>
            </div>
          )}
        </nav>


      </aside>

      {/* ── MAIN ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="session-bar-container">
          <div
            className="session-bar-fill"
            style={{
              width     : `${session.pct}%`,
              background: session.danger ? '#FF4D6D' : session.warning ? '#F59E0B' : '#0055FE',
            }}
          />
        </div>

        <header className="flex items-center justify-between px-6 py-3 bg-bg2 border-b border-border">
          {/* Barra de progresso de faturamento na topbar */}
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-6">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Trophy size={13} style={{ color: tierColor }} />
              <span className="text-xs font-semibold" style={{ color: tierColor }}>{tier}</span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-bg3 overflow-hidden max-w-[200px]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${tierProgress}%`, background: tierColor }}
              />
            </div>
            <span className="text-[10px] text-text3 flex-shrink-0">
              {formatBRL(volumeCents)}
              {tierNextGoal ? ` / ${formatBRL(tierNextGoal)}` : ' — Diamante'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Usuário na topbar */}
            <div className="flex items-center gap-2.5 pr-2 border-r border-border">
              {(user as any)?.avatarUrl ? (
                <img src={(user as any).avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm font-bold flex-shrink-0">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-text leading-tight">{user?.name}</div>
                <div className="text-[10px] text-text3">Afiliado</div>
              </div>
            </div>
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              session.danger  ? 'bg-red/10 text-red border-red/20' :
              session.warning ? 'bg-amber/10 text-amber border-amber/20' :
              'bg-amber/10 text-amber border-amber/20'
            )}>
              ⏱ {session.label}
            </span>
            <button className="btn-ghost btn-sm"><Bell size={16} /></button>
            <button onClick={handleLogout} className="btn-ghost btn-sm text-text3 hover:text-red" title="Sair">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>

      {/* Modal de boas-vindas co-produtor */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-8 shadow-2xl text-center animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles size={32} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Parabéns! 🎉</h2>
            <p className="text-text2 text-sm mb-4">
              Agora você é oficialmente um <strong className="text-text">Co-produtor</strong> na plataforma Kairos Way.
            </p>
            <div className="bg-bg3 rounded-[10px] p-4 mb-6 space-y-2 text-left">
              <div className="flex items-start gap-2 text-sm text-text2">
                <span className="text-accent mt-0.5">✓</span>
                <span>Você já pode cadastrar e gerenciar seus próprios produtos</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-text2">
                <span className="text-accent mt-0.5">✓</span>
                <span>Configure splits e comissões para seus afiliados</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-text2">
                <span className="text-accent mt-0.5">✓</span>
                <span>Acesse o painel de produtor para começar a vender</span>
              </div>
            </div>
            <button
              className="btn-primary w-full justify-center"
              onClick={handleDismissWelcome}
            >
              Começar agora
            </button>
          </div>
        </div>
      )}
            </div>

    </div>
  );
}