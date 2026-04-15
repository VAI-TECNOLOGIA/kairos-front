import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { PageHeader, StatCard } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import { Package, ShoppingCart, DollarSign, TrendingUp, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';

export default function ProducerDashboard() {
  const { isEnabled } = useDashboardConfig();

  const { data } = useQuery({
    queryKey: ['producer-dashboard'],
    queryFn : () => api.get('/producers/dashboard').then(r => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ['my-balance'],
    queryFn : () => api.get('/financial/balance').then(r => r.data),
    enabled : isEnabled('stat_balance_available') || isEnabled('stat_balance_pending'),
  });

  const { data: salesData } = useQuery({
    queryKey: ['my-sales-chart'],
    queryFn : () => api.get('/reports/sales?limit=100&status=APPROVED').then(r => r.data),
    enabled : isEnabled('chart_revenue_7d') || isEnabled('stat_total_sales'),
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
      if (key && days[key]) days[key].receita += o.amountCents || 0;
    });
    return Object.values(days);
  }, [salesData]);

  const temVendas = chartData.some(d => d.receita > 0);

  // Faturamento total calculado a partir das vendas já carregadas (fallback se backend não retornar)
  const totalRevenueCents = data?.totalRevenueCents
    ?? (salesData?.data || []).reduce((acc: number, o: any) => acc + (o.amountCents || 0), 0);

  const monthRevenueCents = data?.monthRevenueCents ?? 0;

  const hasStats = isEnabled('stat_active_products') || isEnabled('stat_total_sales') ||
                   isEnabled('stat_balance_available') || isEnabled('stat_balance_pending') ||
                   isEnabled('stat_total_revenue_prod');
  const hasBottom = isEnabled('chart_revenue_7d') || isEnabled('prod_recent_sales');
  const hasAnyWidget = hasStats || hasBottom || isEnabled('stat_refunds_prod') || isEnabled('stat_total_revenue_prod');

  return (
    <div>
      <PageHeader title="Meu Painel" sub="Visão geral dos seus produtos e vendas" />

      {/* Reembolsos & Chargebacks */}
      {isEnabled('stat_refunds_prod') && <RefundSection refunds={data?.refunds} />}

      {/* KPIs */}
      {hasStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {isEnabled('stat_total_revenue_prod') && (
            <StatCard label="Faturamento total" value={formatBRL(totalRevenueCents)} icon={<TrendingUp size={16} />} sub={`este mês: ${formatBRL(monthRevenueCents)}`} />
          )}
          {isEnabled('stat_balance_pending') && (
            <StatCard label="Saldo pendente"   value={formatBRL(balance?.pendingCents || 0)}   sub="aguardando confirmação" />
          )}
          {isEnabled('stat_active_products') && (
            <StatCard label="Produtos ativos"  value={data?.products || 0}                     icon={<Package size={16} />} />
          )}
          {isEnabled('stat_total_sales') && (
            <StatCard label="Vendas no total"  value={salesData?.total || 0}                   icon={<ShoppingCart size={16} />} />
          )}
        </div>
      )}

      {/* Gráfico + Últimas vendas */}
      {hasBottom && (
        <div className={`grid gap-4 ${isEnabled('chart_revenue_7d') && isEnabled('prod_recent_sales') ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {isEnabled('chart_revenue_7d') && (
            <div className={`card ${isEnabled('prod_recent_sales') ? 'col-span-2' : ''}`}>
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
          )}

          {isEnabled('prod_recent_sales') && (
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
          )}
        </div>
      )}

      {/* Estado vazio */}
      {!hasAnyWidget && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center mb-4">
            <TrendingUp size={22} className="text-green" />
          </div>
          <p className="text-text font-medium mb-1">Dashboard sem itens visíveis</p>
          <p className="text-text3 text-sm">Acesse <strong className="text-text2">Configurar Dashboard</strong> na sidebar para ativar os itens que deseja ver.</p>
        </div>
      )}
    </div>
  );
}


// ── Seção de reembolsos ────────────────────────────────────────
function RefundSection({ refunds }: { refunds?: any }) {
  const refundCount       = refunds?.refundCount       ?? 0;
  const refundAmountCents = refunds?.refundAmountCents ?? 0;
  const chargebackCount   = refunds?.chargebackCount   ?? 0;
  const pendingCount      = refunds?.pendingRefundCount ?? 0;
  const refundRate        = refunds?.refundRate        ?? 0;

  const hasActivity = refundCount > 0 || chargebackCount > 0 || pendingCount > 0;

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <RotateCcw size={15} className="text-text2" />
        <span className="font-semibold text-text text-sm">Reembolsos & Chargebacks</span>
        {hasActivity && refundRate > 5 && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-amber font-medium">
            <AlertTriangle size={11} />
            Taxa elevada
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-bg3 rounded-xl p-3">
          <p className="text-[11px] text-text3 mb-1">Reembolsos</p>
          <p className="text-lg font-bold text-text">{refundCount}</p>
          <p className="text-[11px] text-text3 mt-0.5">{formatBRL(refundAmountCents)}</p>
        </div>
        <div className="bg-bg3 rounded-xl p-3">
          <p className="text-[11px] text-text3 mb-1">Chargebacks</p>
          <p className={`text-lg font-bold ${chargebackCount > 0 ? 'text-red' : 'text-text'}`}>
            {chargebackCount}
          </p>
          <p className="text-[11px] text-text3 mt-0.5">contestações</p>
        </div>
        <div className="bg-bg3 rounded-xl p-3">
          <p className="text-[11px] text-text3 mb-1 flex items-center gap-1">
            <Clock size={10} />
            Aguardando análise
          </p>
          <p className={`text-lg font-bold ${pendingCount > 0 ? 'text-amber' : 'text-text'}`}>
            {pendingCount}
          </p>
          <p className="text-[11px] text-text3 mt-0.5">solicitações</p>
        </div>
        <div className="bg-bg3 rounded-xl p-3">
          <p className="text-[11px] text-text3 mb-1">Taxa de reembolso</p>
          <p className={`text-lg font-bold ${refundRate > 5 ? 'text-amber' : refundRate > 10 ? 'text-red' : 'text-text'}`}>
            {refundRate.toFixed(1)}%
          </p>
          <p className="text-[11px] text-text3 mt-0.5">sobre vendas</p>
        </div>
      </div>

      {!hasActivity && (
        <p className="text-xs text-text3 text-center mt-3">Nenhum reembolso ou chargeback registrado.</p>
      )}
    </div>
  );
}
