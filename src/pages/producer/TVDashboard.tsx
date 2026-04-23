import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import DateFilter, { getDefaultRange, type DateRange } from '@/components/DateFilter';
import { Eye, EyeOff, Wifi, TrendingUp, DollarSign, Package, ShoppingCart, Users, RefreshCw, MousePointerClick } from 'lucide-react';
import { usePlatformFee, feeMultiplier } from '@/hooks/usePlatformFee';

const REFETCH_MS   = 10_000;
const COLORS       = ['#00C9A7', '#0055FE', '#7C3AED', '#F59E0B', '#FF4D6D'];

// ── Clock ─────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-text3 text-sm tabular-nums">
      {time.toLocaleTimeString('pt-BR')}
    </span>
  );
}

// ── Countdown ─────────────────────────────────────────────────────
function Countdown({ resetKey }: { resetKey: number }) {
  const [sec, setSec] = useState(REFETCH_MS / 1000);
  useEffect(() => {
    setSec(REFETCH_MS / 1000);
    const t = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resetKey]);
  return <span className="font-mono text-[11px] text-text3 tabular-nums">próxima em {sec}s</span>;
}

// ── Stat Card ─────────────────────────────────────────────────────
function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 bg-bg2 border border-border rounded-2xl px-6 py-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-text3">
        {icon}
        <span className="text-xs font-medium uppercase tracking-widest truncate">{label}</span>
      </div>
      <div className="text-4xl font-bold text-text tabular-nums leading-none truncate">{value}</div>
      {sub && <div className="text-xs text-text3 truncate">{sub}</div>}
    </div>
  );
}

// ── Revenue chart builder (shared) ────────────────────────────────
function buildRevenueChart(orders: any[], dateRange: DateRange) {
  const start     = new Date(dateRange.startDate);
  const end       = new Date(dateRange.endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const days: Record<string, { day: string; receita: number }> = {};
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days[key] = {
      day    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      receita: 0,
    };
  }
  orders.forEach((o: any) => {
    const key = o.createdAt?.slice(0, 10);
    if (key && days[key]) days[key].receita += o.amountCents || 0;
  });
  return Object.values(days);
}

// ── Main ──────────────────────────────────────────────────────────
export default function TVDashboard() {
  const { user }  = useAuthStore();
  const role      = (user as any)?.role as string | undefined;

  const { data: feeData } = usePlatformFee();
  const PLATFORM_FEE = feeMultiplier(feeData);
  const platformPctLabel = `${(PLATFORM_FEE * 100).toFixed(2).replace(/\.?0+$/, '')}%`;

  const [dateRange,     setDateRange]     = useState<DateRange>(getDefaultRange());
  const [filterVisible, setFilterVisible] = useState(true);
  const [refetchKey,    setRefetchKey]    = useState(0);

  const qs = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;

  // ── PRODUCER ────────────────────────────────────────────────────
  const { data: prodDash } = useQuery({
    queryKey: ['tv-prod-dash', dateRange],
    queryFn : () => api.get(`/producers/dashboard?${qs}`).then(r => r.data),
    enabled : role === 'PRODUCER',
    refetchInterval: REFETCH_MS,
    onSuccess: () => setRefetchKey(k => k + 1),
  } as any);

  const { data: prodProducts } = useQuery({
    queryKey: ['tv-prod-products', dateRange],
    queryFn : () => api.get(`/reports/products?${qs}`).then(r => r.data),
    enabled : role === 'PRODUCER',
    refetchInterval: REFETCH_MS,
  } as any);

  // ── ADMIN ────────────────────────────────────────────────────────
  const { data: adminDash } = useQuery({
    queryKey: ['tv-admin-dash', dateRange],
    queryFn : () => api.get(`/admin/dashboard?${qs}`).then(r => r.data),
    enabled : role === 'ADMIN' || role === 'STAFF',
    refetchInterval: REFETCH_MS,
    onSuccess: () => setRefetchKey(k => k + 1),
  } as any);

  const { data: adminProducts } = useQuery({
    queryKey: ['tv-admin-products', dateRange],
    queryFn : () => api.get(`/reports/products?${qs}`).then(r => r.data),
    enabled : role === 'ADMIN' || role === 'STAFF',
    refetchInterval: REFETCH_MS,
  } as any);

  // ── AFFILIATE ────────────────────────────────────────────────────
  const { data: affStats } = useQuery({
    queryKey: ['tv-aff-stats', dateRange],
    queryFn : () => api.get(`/affiliates/my-stats?${qs}`).then(r => r.data),
    enabled : role === 'AFFILIATE',
    refetchInterval: REFETCH_MS,
    onSuccess: () => setRefetchKey(k => k + 1),
  } as any);

  // ── SALES (shared — backend filtra por role) ─────────────────────
  const { data: salesData } = useQuery({
    queryKey: ['tv-sales', dateRange],
    queryFn : () => api.get(`/reports/sales?limit=500&status=APPROVED&${qs}`).then(r => r.data),
    refetchInterval: REFETCH_MS,
  });

  // ── Build charts ─────────────────────────────────────────────────
  const revenueChart = useMemo(
    () => buildRevenueChart((salesData as any)?.data || [], dateRange),
    [salesData, dateRange],
  );

  const topProducts = useMemo(() => {
    const src = role === 'ADMIN' || role === 'STAFF' ? adminProducts : prodProducts;
    const list: any[] = (src as any)?.products || (src as any) || [];
    return [...list]
      .sort((a, b) => (b.receitaCents ?? 0) - (a.receitaCents ?? 0))
      .slice(0, 5)
      .map(p => ({ name: p.name?.slice(0, 22) || '—', receita: p.receitaCents ?? 0 }));
  }, [prodProducts, adminProducts, role]);

  // ── Stats per role ───────────────────────────────────────────────
  const stats = useMemo(() => {
    if (role === 'ADMIN' || role === 'STAFF') {
      const d = adminDash as any;
      return [
        { label: 'Receita Total',       value: formatBRL(d?.totalRevenueCents ?? 0),          sub: dateRange.label,                   icon: <TrendingUp size={14} /> },
        { label: 'Taxa da Plataforma',  value: formatBRL(Math.round((d?.totalRevenueCents ?? 0) * PLATFORM_FEE)), sub: `${platformPctLabel} sobre todas as vendas`, icon: <DollarSign size={14} /> },
        { label: 'Vendas Aprovadas',    value: String(d?.totalOrders ?? 0),                   sub: 'no período',                      icon: <ShoppingCart size={14} /> },
        { label: 'Produtores Ativos',   value: String(d?.totalProducers ?? 0),                sub: `${d?.pendingKyc ?? 0} aguardando KYC`, icon: <Users size={14} /> },
        { label: 'Assinaturas Ativas',  value: String(d?.activeSubscriptions ?? 0),           sub: 'recorrentes',                    icon: <RefreshCw size={14} /> },
      ];
    }

    if (role === 'AFFILIATE') {
      const d = affStats as any;
      const conversions = d?.totalConversions ?? 0;
      const volume      = d?.volumeCents ?? 0;
      const ticketMedio = conversions > 0 ? Math.round(volume / conversions) : 0;
      return [
        { label: 'Volume de Vendas',    value: formatBRL(volume),                             sub: dateRange.label,                   icon: <TrendingUp size={14} /> },
        { label: 'Comissão Disponível', value: formatBRL(d?.availableCents ?? 0),             sub: 'saldo liberado',                  icon: <DollarSign size={14} /> },
        { label: 'Conversões',          value: String(conversions),                           sub: 'vendas aprovadas',                icon: <ShoppingCart size={14} /> },
        { label: 'Ticket Médio',        value: formatBRL(ticketMedio),                        sub: `tier: ${d?.currentTier?.name ?? '—'}`, icon: <DollarSign size={14} /> },
      ];
    }

    // PRODUCER (default)
    const d = prodDash as any;
    const bruto = d?.totalRevenueCents ?? (salesData as any)?.totalRevenueCents ?? 0;
    return [
      { label: 'Faturamento Bruto',   value: formatBRL(bruto),                              sub: dateRange.label,                   icon: <TrendingUp size={14} /> },
      { label: 'Comissão Líquida',    value: formatBRL(Math.round(bruto * (1 - PLATFORM_FEE))), sub: `após taxa da plataforma (${platformPctLabel})`, icon: <DollarSign size={14} /> },
      { label: 'Vendas Aprovadas',    value: String((salesData as any)?.total ?? 0),        sub: 'no período',                      icon: <ShoppingCart size={14} /> },
      { label: 'Produtos Ativos',     value: String(d?.products ?? 0),                      sub: 'aprovados na plataforma',         icon: <Package size={14} /> },
    ];
  }, [role, adminDash, affStats, prodDash, salesData, dateRange]);

  const showTopProducts = role !== 'AFFILIATE';

  return (
    <div className="min-h-screen bg-bg flex flex-col p-5 gap-5 overflow-hidden select-none">

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/kairosLogo.png" alt="" className="w-7 h-7 rounded-lg object-contain opacity-60" />
          <span className="text-xs font-bold text-text3 tracking-widest uppercase">Kairos Way</span>
          {role && (
            <span className="text-[10px] text-text3 bg-bg2 border border-border px-2 py-0.5 rounded-full">
              {role === 'ADMIN' || role === 'STAFF' ? 'Admin' : role === 'AFFILIATE' ? 'Afiliado' : 'Produtor'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className={`transition-all duration-300 overflow-hidden ${filterVisible ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 pointer-events-none'}`}>
            <DateFilter value={dateRange} onChange={setDateRange} />
          </div>
          <button
            onClick={() => setFilterVisible(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg2 border border-border text-text3 hover:text-text hover:border-accent/40 transition-all"
            title={filterVisible ? 'Ocultar filtro de data' : 'Mostrar filtro de data'}
          >
            {filterVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <Clock />
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="flex gap-4">
        {stats.map(s => <Stat key={s.label} {...s} />)}
      </div>

      {/* ── Gráficos ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Receita por dia */}
        <div className={`${showTopProducts ? 'flex-[2]' : 'flex-1'} bg-bg2 border border-border rounded-2xl p-5 flex flex-col min-h-0`}>
          <div className="text-xs font-semibold text-text3 uppercase tracking-widest mb-4">
            Receita por dia — {dateRange.label}
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00C9A7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00C9A7" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.2)" />
                <XAxis dataKey="day" tick={{ fill: '#5A6780', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={v => `R$${(v / 100).toFixed(0)}`} tick={{ fill: '#5A6780', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  formatter={(v: number) => [formatBRL(v), 'Receita']}
                  contentStyle={{ background: '#0D1130', border: '1px solid rgba(61,69,96,0.5)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#8B9AB8' }}
                />
                <Area type="monotone" dataKey="receita" stroke="#00C9A7" strokeWidth={2.5} fill="url(#tvGrad)" dot={false} activeDot={{ r: 5, fill: '#00C9A7' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Produtos (apenas producer/admin) */}
        {showTopProducts && (
          <div className="flex-1 bg-bg2 border border-border rounded-2xl p-5 flex flex-col min-h-0">
            <div className="text-xs font-semibold text-text3 uppercase tracking-widest mb-4">
              Top Produtos
            </div>
            {topProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-text3 text-sm">
                Sem dados no período
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.2)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `R$${(v / 100).toFixed(0)}`} tick={{ fill: '#5A6780', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#8B9AB8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      formatter={(v: number) => [formatBRL(v), 'Receita']}
                      contentStyle={{ background: '#0D1130', border: '1px solid rgba(61,69,96,0.5)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="receita" radius={[0, 6, 6, 0]}>
                      {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Rodapé ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-text3">
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse inline-block" />
          <Wifi size={11} />
          <span>Ao vivo</span>
        </div>
        <Countdown resetKey={refetchKey} />
      </div>

    </div>
  );
}
