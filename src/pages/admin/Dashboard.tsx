import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';
import { StatCard, PageHeader, Loading } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import {
  TrendingUp, Users, ShoppingCart, RefreshCw,
  AlertCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import DateFilter, { getDefaultRange, type DateRange } from '@/components/DateFilter';

const COLORS = ['#0055FE', '#00C9A7', '#F59E0B', '#FF4D6D', '#7C3AED'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg2 border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-text3 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('receita')
            ? formatBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { isEnabled } = useDashboardConfig();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());

  const qs = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', dateRange.startDate, dateRange.endDate],
    queryFn : () => api.get(`/admin/dashboard?${qs}`).then(r => r.data),
  });

  const { data: salesData } = useQuery({
    queryKey: ['admin-sales-chart', dateRange.startDate, dateRange.endDate],
    queryFn : () => api.get(`/reports/sales?limit=500&status=APPROVED&${qs}`).then(r => r.data),
    enabled : isEnabled('chart_revenue_14d') || isEnabled('chart_payment_mix') || isEnabled('chart_hourly_orders'),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['admin-sales-recent'],
    queryFn : () => api.get('/reports/sales?limit=8').then(r => r.data),
    enabled : isEnabled('list_recent_sales'),
  });

  // Receita por dia — período selecionado
  const revenueChart = useMemo(() => {
    const orders = salesData?.data || [];
    const days: Record<string, { day: string; receita: number; pedidos: number }> = {};
    const start = new Date(dateRange.startDate);
    const end   = new Date(dateRange.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = {
        day    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        receita: 0,
        pedidos: 0,
      };
    }
    orders.forEach((o: any) => {
      const key = o.createdAt?.slice(0, 10);
      if (key && days[key]) {
        days[key].receita += o.amountCents || 0;
        days[key].pedidos += 1;
      }
    });
    return Object.values(days);
  }, [salesData, dateRange]);

  // Mix de pagamentos
  const paymentMix = useMemo(() => {
    const orders = salesData?.data || [];
    const map: Record<string, number> = { PIX: 0, CREDIT_CARD: 0, BOLETO: 0 };
    orders.forEach((o: any) => { if (map[o.paymentMethod] !== undefined) map[o.paymentMethod]++; });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    if (!total) return [];
    return [
      { name: 'Pix',    value: Math.round(map.PIX         / total * 100), count: map.PIX },
      { name: 'Cartão', value: Math.round(map.CREDIT_CARD / total * 100), count: map.CREDIT_CARD },
      { name: 'Boleto', value: Math.round(map.BOLETO      / total * 100), count: map.BOLETO },
    ].filter(d => d.count > 0);
  }, [salesData]);

  // Receita por hora
  const hourlyChart = useMemo(() => {
    const orders = salesData?.data || [];
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hora   : `${String(h).padStart(2, '0')}h`,
      pedidos: 0,
    }));
    orders.forEach((o: any) => {
      const h = new Date(o.createdAt).getHours();
      hours[h].pedidos++;
    });
    return hours.filter((_, i) => i >= 6 && i <= 23);
  }, [salesData]);

  // Semana atual vs anterior
  const weekData = useMemo(() => {
    const orders = salesData?.data || [];
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    let thisWeek = 0, lastWeek = 0;
    orders.forEach((o: any) => {
      const d = new Date(o.createdAt);
      if (d >= thisWeekStart) thisWeek += o.amountCents;
      else if (d >= lastWeekStart) lastWeek += o.amountCents;
    });
    const delta = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100) : 0;
    return { thisWeek, lastWeek, delta };
  }, [salesData]);

  if (isLoading) return <Loading />;

  const ticketMedio = data?.totalOrders
    ? Math.round((data.totalRevenueCents || 0) / data.totalOrders)
    : 0;

  // Verifica se algum dos stat cards está visível para renderizar a grid
  const hasStats = isEnabled('stat_revenue_total') || isEnabled('stat_producers') ||
                   isEnabled('stat_orders') || isEnabled('stat_subscriptions');

  // Verifica se a linha de gráfico/vendas recentes tem algo
  const hasChartRow    = isEnabled('chart_revenue_14d') || isEnabled('list_recent_sales');
  const hasBottomRow   = isEnabled('chart_payment_mix') || isEnabled('chart_hourly_orders');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title={data?.adminName ? `Olá, ${data.adminName.split(' ')[0]}!` : 'Dashboard'}
          sub="Visão geral da plataforma Kairos Way"
        />
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPIs */}
      {hasStats && (
        <div className="grid grid-cols-4 gap-4">
          {isEnabled('stat_revenue_total') && (
            <StatCard
              label="Receita total"
              value={formatBRL(data?.totalRevenueCents || 0)}
              sub={`Ticket médio: ${formatBRL(ticketMedio)}`}
              icon={<TrendingUp size={16} />}
            />
          )}
          {isEnabled('stat_producers') && (
            <StatCard
              label="Produtores ativos"
              value={data?.totalProducers || 0}
              sub={data?.pendingKyc ? `${data.pendingKyc} aguardando KYC` : 'Todos aprovados'}
              icon={<Users size={16} />}
            />
          )}
          {isEnabled('stat_orders') && (
            <StatCard
              label="Vendas aprovadas"
              value={data?.totalOrders || 0}
              icon={<ShoppingCart size={16} />}
            />
          )}
          {isEnabled('stat_subscriptions') && (
            <StatCard
              label="Assinaturas ativas"
              value={data?.activeSubscriptions || 0}
              icon={<RefreshCw size={16} />}
            />
          )}
        </div>
      )}

      {/* Alerta KYC */}
      {isEnabled('alert_kyc') && (data?.pendingKyc || 0) > 0 && (
        <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-[10px] p-3">
          <AlertCircle size={16} className="text-amber flex-shrink-0" />
          <span className="text-sm text-amber">
            {data.pendingKyc} produtor(es) aguardando aprovação KYC —{' '}
            <a href="/admin/produtores" className="underline hover:text-amber/80">Ver pendentes</a>
          </span>
        </div>
      )}

      {/* Receita + Últimas vendas */}
      {hasChartRow && (
        <div className={`grid gap-4 ${isEnabled('chart_revenue_14d') && isEnabled('list_recent_sales') ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {isEnabled('chart_revenue_14d') && (
            <div className={`card ${isEnabled('list_recent_sales') ? 'col-span-2' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="section-title">Receita — {dateRange.label}</div>
                  <div className="text-xs text-text3">Vendas aprovadas</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text3">Esta semana vs anterior</div>
                  <div className={`flex items-center gap-1 justify-end text-sm font-semibold ${weekData.delta >= 0 ? 'text-green' : 'text-red'}`}>
                    {weekData.delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(weekData.delta).toFixed(1)}%
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0055FE" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0055FE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.25)" />
                  <XAxis dataKey="day" tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `R$${(v/100).toFixed(0)}`} tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#0055FE" strokeWidth={2} fill="url(#gReceita)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {isEnabled('list_recent_sales') && (
            <div className="card">
              <div className="section-title mb-3">Últimas vendas</div>
              <div className="space-y-2.5">
                {(recentSales?.data || []).slice(0, 6).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text truncate">{o.customerName || '—'}</div>
                      <div className="text-[10px] text-text3">
                        {formatDate(o.createdAt)} · {o.paymentMethod === 'PIX' ? 'Pix' : o.paymentMethod === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-green flex-shrink-0 ml-2">
                      {formatBRL(o.amountCents)}
                    </div>
                  </div>
                ))}
                {(!recentSales?.data || recentSales.data.length === 0) && (
                  <p className="text-sm text-text3 text-center py-4">Nenhuma venda ainda</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mix pagamentos + Pedidos por hora */}
      {hasBottomRow && (
        <div className={`grid gap-4 ${isEnabled('chart_payment_mix') && isEnabled('chart_hourly_orders') ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {isEnabled('chart_payment_mix') && (
            <div className="card">
              <div className="section-title mb-1">Mix de pagamentos</div>
              <div className="text-xs text-text3 mb-3">Vendas aprovadas</div>
              {paymentMix.length === 0 ? (
                <p className="text-sm text-text3 text-center py-6">Sem dados</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={paymentMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {paymentMix.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ background: '#0D1130', border: '1px solid rgba(61,69,96,0.5)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {paymentMix.map((m, i) => (
                      <div key={m.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                          <span className="text-text2">{m.name}</span>
                        </div>
                        <span className="font-semibold text-text">{m.value}% <span className="text-text3 font-normal">({m.count})</span></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {isEnabled('chart_hourly_orders') && (
            <div className={`card ${isEnabled('chart_payment_mix') ? 'col-span-2' : ''}`}>
              <div className="section-title mb-1">Pedidos por hora do dia</div>
              <div className="text-xs text-text3 mb-3">Concentração de vendas</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyChart} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.25)" />
                  <XAxis dataKey="hora" tick={{ fill: '#8B9AB8', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pedidos" name="Pedidos" fill="#0055FE" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {!hasStats && !isEnabled('alert_kyc') && !hasChartRow && !hasBottomRow && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TrendingUp size={22} className="text-accent" />
          </div>
          <p className="text-text font-medium mb-1">Dashboard sem itens visíveis</p>
          <p className="text-text3 text-sm">Acesse <strong className="text-text2">Configurar Dashboard</strong> na sidebar para ativar os itens que deseja ver.</p>
        </div>
      )}
    </div>
  );
}
