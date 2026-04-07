import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '@/lib/api';
import { StatCard, PageHeader, Loading } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import {
  TrendingUp, Users, ShoppingCart, RefreshCw,
  AlertCircle, ArrowUpRight, ArrowDownRight, DollarSign, Percent
} from 'lucide-react';

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
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn : () => api.get('/admin/dashboard').then(r => r.data),
  });

  const { data: salesData } = useQuery({
    queryKey: ['admin-sales-chart'],
    queryFn : () => api.get('/reports/sales?limit=200&status=APPROVED').then(r => r.data),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['admin-sales-recent'],
    queryFn : () => api.get('/reports/sales?limit=8').then(r => r.data),
  });

  // Receita por dia — últimos 14 dias
  const revenueChart = useMemo(() => {
    const orders = salesData?.data || [];
    const days: Record<string, { day: string; receita: number; pedidos: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
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
  }, [salesData]);

  // Mix de pagamentos — dados reais
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

  // Receita por hora do dia (últimas vendas)
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
    return hours.filter((_, i) => i >= 6 && i <= 23); // 6h às 23h
  }, [salesData]);

  // Receita semana atual vs anterior
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={data && (data as any)?.adminName ? `Olá, ${(data as any).adminName.split(' ')[0]}! 👋` : 'Dashboard'}
        sub={data && (data as any)?.adminName ? 'Visão geral da plataforma Kairos Way' : 'Configure seu perfil para personalizar sua experiência'}
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Receita total"
          value={formatBRL(data?.totalRevenueCents || 0)}
          sub={`Ticket médio: ${formatBRL(ticketMedio)}`}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Produtores ativos"
          value={data?.totalProducers || 0}
          sub={data?.pendingKyc ? `${data.pendingKyc} aguardando KYC` : 'Todos aprovados'}
          icon={<Users size={16} />}
        />
        <StatCard
          label="Vendas aprovadas"
          value={data?.totalOrders || 0}
          icon={<ShoppingCart size={16} />}
        />
        <StatCard
          label="Assinaturas ativas"
          value={data?.activeSubscriptions || 0}
          icon={<RefreshCw size={16} />}
        />
      </div>

      {/* Alerta KYC */}
      {(data?.pendingKyc || 0) > 0 && (
        <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-[10px] p-3">
          <AlertCircle size={16} className="text-amber flex-shrink-0" />
          <span className="text-sm text-amber">
            {data.pendingKyc} produtor(es) aguardando aprovação KYC —{' '}
            <a href="/admin/produtores" className="underline hover:text-amber/80">Ver pendentes</a>
          </span>
        </div>
      )}

      {/* Receita + Semana */}
      <div className="grid grid-cols-3 gap-4">
        {/* Gráfico de receita */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Receita — últimos 14 dias</div>
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

        {/* Últimas vendas */}
        <div className="card">
          <div className="section-title mb-3">Últimas vendas</div>
          <div className="space-y-2.5">
            {(recentSales?.data || []).slice(0, 6).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text truncate">{o.customerName || '—'}</div>
                  <div className="text-[10px] text-text3">{formatDate(o.createdAt)} · {o.paymentMethod === 'PIX' ? 'Pix' : o.paymentMethod === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}</div>
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
      </div>

      {/* Mix pagamentos + Pedidos por hora */}
      <div className="grid grid-cols-3 gap-4">
        {/* Mix */}
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

        {/* Pedidos por hora */}
        <div className="card col-span-2">
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
      </div>
    </div>
  );
}