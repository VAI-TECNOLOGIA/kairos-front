import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { PageHeader, StatCard } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import { Package, ShoppingCart, DollarSign } from 'lucide-react';

export default function ProducerDashboard() {
  const { data } = useQuery({
    queryKey: ['producer-dashboard'],
    queryFn: () => api.get('/producers/dashboard').then(r => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ['my-balance'],
    queryFn: () => api.get('/financial/balance').then(r => r.data),
  });

  const { data: salesData } = useQuery({
    queryKey: ['my-sales-chart'],
    queryFn: () => api.get('/reports/sales?limit=100&status=APPROVED').then(r => r.data),
  });

  // Agrupar vendas por dia — últimos 7 dias
  const chartData = useMemo(() => {
    const orders = salesData?.data || [];
    const days: Record<string, { day: string; receita: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = {
        day    : ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()],
        receita: 0,
      };
    }

    orders.forEach((o: any) => {
      const key = o.createdAt?.slice(0, 10);
      if (key && days[key]) {
        days[key].receita += o.amountCents || 0;
      }
    });

    return Object.values(days);
  }, [salesData]);

  const temVendas = chartData.some(d => d.receita > 0);

  return (
    <div>
      <PageHeader title="Meu Painel" sub="Visão geral dos seus produtos e vendas" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Produtos ativos"   value={data?.products || 0}                    icon={<Package size={16} />} />
        <StatCard label="Vendas no total"   value={salesData?.total || 0}                  icon={<ShoppingCart size={16} />} />
        <StatCard label="Saldo disponível"  value={formatBRL(balance?.availableCents || 0)} icon={<DollarSign size={16} />} />
        <StatCard label="Saldo pendente"    value={formatBRL(balance?.pendingCents || 0)}   sub="aguardando confirmação" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Gráfico — dados reais */}
        <div className="card col-span-2">
          <div className="section-title mb-1">Receita — últimos 7 dias</div>
          <div className="text-xs text-text3 mb-4">Vendas aprovadas</div>
          {!temVendas ? (
            <div className="flex items-center justify-center h-[200px] text-text3 text-sm">
              Nenhuma venda aprovada nos últimos 7 dias
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00C9A7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00C9A7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.3)" />
                <XAxis dataKey="day" tick={{ fill: '#8B9AB8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `R$${(v / 100).toFixed(0)}`}
                  tick={{ fill: '#8B9AB8', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{ background: '#0D1130', border: '1px solid rgba(61,69,96,0.5)', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="receita" stroke="#00C9A7" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Últimas vendas */}
        <div className="card">
          <div className="section-title mb-4">Últimas vendas</div>
          <div className="space-y-3">
            {(data?.recentOrders || []).slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-text2 truncate">{o.customerName || '—'}</div>
                  <div className="text-xs text-text3">{formatDate(o.createdAt)}</div>
                </div>
                <div className="text-sm font-semibold text-green flex-shrink-0 ml-2">
                  {formatBRL(o.amountCents)}
                </div>
              </div>
            ))}
            {(!data?.recentOrders || data.recentOrders.length === 0) && (
              <p className="text-sm text-text3 text-center py-4">Nenhuma venda ainda</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}