import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { PageHeader, StatCard } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { DollarSign, Link2, TrendingUp, ShoppingCart, Handshake, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg2 border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-text3 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
};

const FILTERS = [
  { key: 'all',       label: 'Todos'           },
  { key: 'own',       label: 'Seus produtos'   },
  { key: 'affiliate', label: 'Suas afiliações' },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

export default function AffiliateDashboard() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter]       = useState<FilterKey>('all');

  const { data: stats } = useQuery({
    queryKey: ['affiliate-stats', filter],
    queryFn : () => api.get(`/affiliates/my-stats?filter=${filter}`).then(r => r.data),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['affiliate-enrollments'],
    queryFn : () => api.get('/affiliates/my-enrollments').then(r => r.data),
  });

  const { data: chartData } = useQuery({
    queryKey: ['affiliate-chart', filter],
    queryFn : () => api.get(`/affiliates/my-chart?filter=${filter}`).then(r => r.data),
  });

  const { data: coRequest } = useQuery({
    queryKey: ['coproducer-request-status'],
    queryFn : () => api.get('/coproducer-requests/my-status').then(r => r.data),
  });

  const requestCoproducer = useMutation({
    mutationFn: () => api.post('/coproducer-requests'),
    onSuccess: () => {
      toast.success('Solicitação enviada! Aguarde a análise.');
      qc.invalidateQueries({ queryKey: ['coproducer-request-status'] });
      setShowModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao enviar solicitação'),
  });

  const topOffers     = (enrollments || []).sort((a: any, b: any) => b.revenueCents - a.revenueCents).slice(0, 5);
  const totalSales    = stats?.totalSales  || 0;
  const volumeCents   = stats?.volumeCents || 0;
  const ticketMedio   = totalSales > 0 ? Math.round(volumeCents / totalSales) : 0;
  const requestStatus = coRequest?.status || null;
  const canCreate     = stats?.canCreateProducts || false;

  return (
    <div>
      <PageHeader title="Meu Painel" sub="Visão geral das suas comissões e conversões" />

      {/* Filtros de faturamento — só aparece para co-produtores */}
      {canCreate && (
        <div className="flex gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Faturamento gerado"  value={formatBRL(volumeCents)}               icon={<TrendingUp size={16} />} />
        <StatCard label="Comissão disponível" value={formatBRL(stats?.availableCents || 0)} icon={<DollarSign size={16} />} />
        <StatCard label="Ticket médio"        value={formatBRL(ticketMedio)}                />
        <StatCard label="Vendas realizadas"   value={totalSales}                            icon={<ShoppingCart size={16} />} />
      </div>

      {/* Gráfico de receita */}
      <div className="card mb-6">
        <div className="section-title mb-1">Faturamento — últimos 14 dias</div>
        <div className="text-xs text-text3 mb-4">
          {filter === 'own' ? 'Vendas dos seus produtos' : filter === 'affiliate' ? 'Vendas pelos seus links' : 'Todas as vendas'}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData || []}>
            <defs>
              <linearGradient id="gAfiliado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0055FE" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0055FE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.25)" />
            <XAxis dataKey="day" tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `R$${(v / 100).toFixed(0)}`} tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="receita" name="Receita" stroke="#0055FE" strokeWidth={2} fill="url(#gAfiliado)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top ofertas */}
      <div className="card mb-6">
        <div className="section-title mb-4">Top ofertas por receita</div>
        {topOffers.length === 0 ? (
          <div className="empty-state">
            <Link2 size={28} className="text-text2 mb-2" />
            <p className="text-text2 text-sm">Nenhuma oferta promovida ainda.</p>
            <p className="text-text3 text-xs mt-1">Acesse o Marketplace para se inscrever em ofertas.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Produto</th><th>Comissão</th><th>Conversões</th><th>Receita</th></tr>
              </thead>
              <tbody>
                {topOffers.map((e: any) => (
                  <tr key={e.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {e.productImage && <img src={e.productImage} alt="" className="w-8 h-8 rounded object-cover" />}
                        <div>
                          <div className="font-medium text-text">{e.productName}</div>
                          <div className="text-xs text-text3">{e.offerName}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge-blue">{e.commissionBps / 100}%</span></td>
                    <td>{e.conversions}</td>
                    <td className="font-semibold text-accent">{formatBRL(e.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Banner quero ser co-produtor */}
      <div className="card flex items-center justify-between gap-4" style={{ borderColor: 'rgba(0,85,254,0.2)', background: 'rgba(0,85,254,0.04)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Handshake size={18} className="text-accent" />
          </div>
          <div>
            <div className="font-semibold text-text text-sm">Quer ir além?</div>
            <div className="text-xs text-text3">Torne-se co-produtor e cadastre seus próprios produtos para vender na plataforma.</div>
          </div>
        </div>
        {requestStatus === 'PENDING' ? (
          <button className="btn-secondary btn-sm opacity-60 cursor-not-allowed flex-shrink-0" disabled>
            <Handshake size={13} /> Solicitação em análise
          </button>
        ) : requestStatus === 'APPROVED' ? (
          <span className="badge-green flex-shrink-0">Aprovado</span>
        ) : requestStatus === 'REJECTED' ? (
          <span className="badge-red flex-shrink-0 text-xs">Recusado</span>
        ) : (
          <button className="btn-primary btn-sm flex-shrink-0" onClick={() => setShowModal(true)}>
            <Handshake size={13} /> Quero ser co-produtor
          </button>
        )}
      </div>

      {/* Modal de confirmação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-accent/20 flex items-center justify-center">
                  <Handshake size={18} className="text-accent" />
                </div>
                <div className="font-semibold text-text">Solicitação de co-produtor</div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-text3 hover:text-text">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-text2">
                Ao se tornar co-produtor você poderá <strong className="text-text">criar e vender seus próprios produtos</strong> na plataforma Kairos Way.
              </p>
              <div className="bg-bg3 rounded-[8px] p-3 space-y-1.5 text-xs text-text2">
                <div className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Cadastre produtos digitais, físicos ou assinaturas</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Configure splits e comissões para seus afiliados</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">✓</span>
                  <span>Acesse relatórios de vendas e financeiro completo</span>
                </div>
              </div>
              <p className="text-xs text-text3">
                Sua solicitação será analisada pelo produtor ou administrador da plataforma.
              </p>
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1 justify-center"
                onClick={() => requestCoproducer.mutate()}
                disabled={requestCoproducer.isPending}
              >
                {requestCoproducer.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : 'Confirmar solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}