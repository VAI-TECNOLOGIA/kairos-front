import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { PageHeader, Loading, TabNav, StatCard } from '@/components/ui';
import { formatBRL, formatDateTime } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  Link2, Handshake, Package, AlertTriangle,
  TrendingUp, Trophy, DollarSign, ShoppingCart
} from 'lucide-react';

const COLORS = ['#0055FE', '#00C9A7', '#F59E0B', '#FF4D6D', '#7C3AED'];

const TYPE_LABEL: Record<string, string> = {
  DIGITAL: 'Digital', PHYSICAL: 'Físico', SUBSCRIPTION: 'Assinatura', BUNDLE: 'Bundle',
};

export default function ReportsPage() {
  const [tab, setTab] = useState('afiliados');

  const { data: affiliates, isLoading: loadingAff } = useQuery({
    queryKey: ['reports-affiliates'],
    queryFn : () => api.get('/reports/affiliates').then(r => r.data),
    enabled : tab === 'afiliados',
  });

  const { data: coproducers, isLoading: loadingCo } = useQuery({
    queryKey: ['reports-coproducers'],
    queryFn : () => api.get('/reports/coproducers').then(r => r.data),
    enabled : tab === 'coprodutores',
  });

  const { data: products, isLoading: loadingProd } = useQuery({
    queryKey: ['reports-products'],
    queryFn : () => api.get('/reports/products').then(r => r.data),
    enabled : tab === 'produtos',
  });

  const { data: chargebacks, isLoading: loadingCb } = useQuery({
    queryKey: ['reports-chargebacks'],
    queryFn : () => api.get('/reports/chargebacks').then(r => r.data),
    enabled : tab === 'chargebacks',
  });

  const { data: mrr } = useQuery({
    queryKey: ['reports-mrr'],
    queryFn : () => api.get('/reports/mrr').then(r => r.data),
  });

  const affList   : any[] = affiliates   || [];
  const coList    : any[] = coproducers  || [];
  const prodList  : any[] = products     || [];
  const cbList    : any[] = chargebacks  || [];

  const totalAffRevenue = affList.reduce((a: number, x: any) => a + x.receitaCents, 0);
  const topAffiliate    = affList[0];

  return (
    <div>
      <PageHeader title="Relatórios" sub="Performance de afiliados, co-produtores e produtos" />

      {/* KPIs gerais */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Afiliados ativos"
          value={affList.length}
          sub={topAffiliate ? `Top: ${topAffiliate.name}` : undefined}
          icon={<Link2 size={16} />}
        />
        <StatCard
          label="Receita via afiliados"
          value={formatBRL(totalAffRevenue)}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Co-produtores"
          value={coList.length}
          icon={<Handshake size={16} />}
        />
        <StatCard
          label="MRR (assinaturas)"
          value={formatBRL(mrr?.mrrCents || 0)}
          sub={`${mrr?.activeSubscriptions || 0} ativas`}
          icon={<DollarSign size={16} />}
        />
      </div>

      <TabNav
        tabs={[
          { id: 'afiliados',    label: 'Afiliados',     badge: affList.length  || undefined },
          { id: 'coprodutores', label: 'Co-produtores', badge: coList.length   || undefined },
          { id: 'produtos',     label: 'Produtos',      badge: prodList.length || undefined },
          { id: 'chargebacks',  label: 'Chargebacks',   badge: cbList.length   || undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── AFILIADOS ───────────────────────────── */}
      {tab === 'afiliados' && (
        <div className="space-y-4 mt-4">
          {loadingAff ? <Loading /> : affList.length === 0 ? (
            <div className="card text-center py-12 text-text3">Nenhuma venda via afiliado registrada.</div>
          ) : (
            <>
              {/* Gráfico top 8 afiliados */}
              <div className="card">
                <div className="section-title mb-4">Ranking por receita gerada</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={affList.slice(0, 8)} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.2)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `R$${(v/100).toFixed(0)}`} tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#8B9AB8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: '#0D1130', border: '1px solid rgba(61,69,96,0.5)', borderRadius: 8 }} />
                    <Bar dataKey="receitaCents" name="Receita" radius={[0, 4, 4, 0]}>
                      {affList.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela */}
              <div className="card">
                <div className="section-title mb-4">Detalhamento por afiliado</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>Nome</th><th>Código</th><th>E-mail</th><th>Vendas</th><th>Receita gerada</th><th>Ticket médio</th></tr>
                    </thead>
                    <tbody>
                      {affList.map((a: any, i: number) => (
                        <tr key={a.affiliateId}>
                          <td>
                            {i === 0 ? <Trophy size={14} className="text-amber" /> :
                             i === 1 ? <span className="text-text3 font-bold">#2</span> :
                             i === 2 ? <span className="text-text3 font-bold">#3</span> :
                             <span className="text-text3">#{i + 1}</span>}
                          </td>
                          <td className="font-medium text-text">{a.name}</td>
                          <td><code className="text-xs bg-bg3 px-1.5 py-0.5 rounded text-accent">{a.code}</code></td>
                          <td className="text-text2">{a.email}</td>
                          <td className="font-semibold">{a.vendas}</td>
                          <td className="font-semibold text-green">{formatBRL(a.receitaCents)}</td>
                          <td className="text-text2">{a.vendas ? formatBRL(Math.round(a.receitaCents / a.vendas)) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CO-PRODUTORES ────────────────────────── */}
      {tab === 'coprodutores' && (
        <div className="mt-4">
          {loadingCo ? <Loading /> : coList.length === 0 ? (
            <div className="card text-center py-12 text-text3">Nenhum repasse para co-produtores registrado.</div>
          ) : (
            <div className="card">
              <div className="section-title mb-4">Repasses por co-produtor</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Nome</th><th>E-mail</th><th>Repasses</th><th>Total</th><th>Pago</th><th>Pendente</th></tr>
                  </thead>
                  <tbody>
                    {coList.map((c: any) => (
                      <tr key={c.recipientId}>
                        <td className="font-medium text-text">{c.name}</td>
                        <td className="text-text2">{c.email}</td>
                        <td>{c.count}</td>
                        <td className="font-semibold text-text">{formatBRL(c.totalCents)}</td>
                        <td className="text-green font-semibold">{formatBRL(c.paidCents)}</td>
                        <td>
                          <span className={c.pendingCents > 0 ? 'badge-amber' : 'badge-gray'}>
                            {formatBRL(c.pendingCents)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUTOS ─────────────────────────────── */}
      {tab === 'produtos' && (
        <div className="space-y-4 mt-4">
          {loadingProd ? <Loading /> : prodList.length === 0 ? (
            <div className="card text-center py-12 text-text3">Nenhum produto com vendas aprovadas.</div>
          ) : (
            <>
              <div className="card">
                <div className="section-title mb-4">Receita por produto</div>
                <ResponsiveContainer width="100%" height={Math.max(prodList.length * 40, 180)}>
                  <BarChart data={prodList} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,69,96,0.2)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `R$${(v/100).toFixed(0)}`} tick={{ fill: '#8B9AB8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#8B9AB8', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: '#0D1130', border: '1px solid rgba(61,69,96,0.5)', borderRadius: 8 }} />
                    <Bar dataKey="receitaCents" name="Receita" radius={[0, 4, 4, 0]}>
                      {prodList.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="section-title mb-4">Detalhamento por produto</div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>Produto</th><th>Tipo</th><th>Vendas</th><th>Receita</th><th>Ticket médio</th></tr>
                    </thead>
                    <tbody>
                      {prodList.map((p: any, i: number) => (
                        <tr key={p.productId}>
                          <td className="text-text3">#{i + 1}</td>
                          <td className="font-medium text-text">{p.name}</td>
                          <td><span className="badge-gray">{TYPE_LABEL[p.type] || p.type}</span></td>
                          <td className="font-semibold">{p.vendas}</td>
                          <td className="font-semibold text-green">{formatBRL(p.receitaCents)}</td>
                          <td className="text-text2">{p.vendas ? formatBRL(Math.round(p.receitaCents / p.vendas)) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CHARGEBACKS ──────────────────────────── */}
      {tab === 'chargebacks' && (
        <div className="mt-4">
          {loadingCb ? <Loading /> : cbList.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                <ShoppingCart size={20} className="text-green" />
              </div>
              <p className="text-text font-medium">Nenhum chargeback registrado</p>
              <p className="text-sm text-text3 mt-1">Ótimo sinal para a saúde da plataforma.</p>
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-red" />
                <div className="section-title">Chargebacks e reembolsos</div>
                <span className="badge-red ml-1">{cbList.length}</span>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Valor</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    {cbList.map((o: any) => (
                      <tr key={o.id}>
                        <td><code className="text-xs bg-bg3 px-1.5 py-0.5 rounded">{o.id.slice(-8).toUpperCase()}</code></td>
                        <td className="font-medium text-text">{o.customerName}</td>
                        <td className="text-text2">{o.offer?.product?.name || '—'}</td>
                        <td className="font-semibold text-red">{formatBRL(o.amountCents)}</td>
                        <td className="text-text3">{formatDateTime(o.chargebackAt || o.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}