import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Loading } from '@/components/ui';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { DollarSign, ArrowDownToLine, Percent, CreditCard, Clock, Banknote, Building2, TrendingUp, Filter } from 'lucide-react';

interface Data {
  period             : string;
  grossCents         : number;
  withdrawCents      : number;
  taxOperationCents  : number;
  taxInstallmentCents: number;
  taxAnticipationCents: number;
  taxWithdrawCents   : number;
  acquirerCostCents  : number;
  profitCents        : number;
  byAcquirer         : Array<{
    acquirer            : string;
    salesCount          : number;
    salesCents          : number;
    gatewayFeeCents     : number;
    installmentFeeCents : number;
    anticipationFeeCents: number;
    acquirerCostCents   : number;
    profitCents         : number;
  }>;
}

const KPI = ({ icon: Icon, label, value, color = 'text-text' }: any) => (
  <div className="card p-3">
    <div className="flex items-center justify-between text-xs text-text3">
      <span>{label}</span>
      <Icon size={14} />
    </div>
    <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
  </div>
);

export default function AdminFeesRevenue() {
  const [period, setPeriod] = useState<'last_week' | 'month'>('last_week');

  const { data, isLoading } = useQuery<Data>({
    queryKey: ['admin-fees-revenue', period],
    queryFn : () => api.get('/admin/fees-revenue', { params: { period } }).then(r => r.data),
  });

  if (isLoading || !data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Receitas e taxas"
        sub="Exibição das informações das taxas"
      />

      {/* 8 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI icon={DollarSign}      label="Faturamento Bruto"      value={formatBRL(data.grossCents)} color="text-text" />
        <KPI icon={ArrowDownToLine} label="Total em saques"        value={formatBRL(data.withdrawCents)} color="text-text" />
        <KPI icon={Percent}         label="Taxas de operação"      value={formatBRL(data.taxOperationCents)} color="text-accent" />
        <KPI icon={CreditCard}      label="Taxas de parcelamento"  value={formatBRL(data.taxInstallmentCents)} color="text-text" />
        <KPI icon={Clock}           label="Taxas de antecipação"   value={formatBRL(data.taxAnticipationCents)} color="text-text" />
        <KPI icon={Banknote}        label="Taxas de saque"         value={formatBRL(data.taxWithdrawCents)} color="text-text" />
        <KPI icon={Building2}       label="Custos de adquirente"   value={formatBRL(data.acquirerCostCents)} color="text-red" />
        <KPI icon={TrendingUp}      label="Lucro da empresa"       value={formatBRL(data.profitCents)} color="text-green" />
      </div>

      {/* Filtro temporal */}
      <div className="card p-3 mb-3 flex items-center gap-3">
        <Filter size={14} className="text-text3" />
        <select value={period} onChange={e => setPeriod(e.target.value as any)} className="input input-sm">
          <option value="last_week">Última semana</option>
          <option value="month">Último mês</option>
        </select>
      </div>

      {/* Breakdown por adquirente */}
      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Adquirente</th>
              <th className="text-right">Vendas</th>
              <th className="text-right">Taxa da gateway</th>
              <th className="text-right">Taxa de parcelamento</th>
              <th className="text-right">Taxa de antecipação</th>
              <th className="text-right">Custo da adquirente</th>
              <th className="text-right">Lucro da empresa</th>
            </tr>
          </thead>
          <tbody>
            {data.byAcquirer.map((b, i) => (
              <tr key={i}>
                <td className="font-medium capitalize">{b.acquirer || 'Pagar.me'}</td>
                <td className="text-right">
                  <div className="font-medium">{formatBRL(b.salesCents)}</div>
                  <div className="text-[10px] text-text3">{b.salesCount} vendas</div>
                </td>
                <td className="text-right text-accent">{formatBRL(b.gatewayFeeCents)}</td>
                <td className="text-right text-text2">{formatBRL(b.installmentFeeCents)}</td>
                <td className="text-right text-text2">{formatBRL(b.anticipationFeeCents)}</td>
                <td className="text-right text-red">- {formatBRL(b.acquirerCostCents)}</td>
                <td className="text-right text-green">{formatBRL(b.profitCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
