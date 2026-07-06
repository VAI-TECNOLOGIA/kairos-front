import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Modal, Loading, EmptyState, DateCell, WhatsAppLink } from '@/components/ui';
import { formatBRL, orderStatusVariant } from '@/lib/utils';
import type { Order } from '@/types';
import { ShoppingCart, ChevronLeft, ChevronRight, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle, RotateCcw, Search, User, Package, DollarSign, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const LIMIT = 20;

const STATUS_FILTERS = [
  { value: '',           label: 'Todas'      },
  { value: 'APPROVED',   label: 'Aprovadas'  },
  { value: 'PENDING',    label: 'Pendentes'  },
  { value: 'PROCESSING', label: 'Processando'},
  { value: 'REJECTED',   label: 'Recusadas'  },
  { value: 'REFUNDED',   label: 'Reembolsadas'},
  { value: 'CANCELLED',  label: 'Canceladas' },
] as const;

export default function SalesPage() {
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState<string>('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProducer, setSearchProducer] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Detalhes completos do pedido (produtor, afiliado, cliente, splits) — só busca quando abre
  const { data: detail, isLoading: loadingDetail } = useQuery<any>({
    queryKey: ['admin-sale-detail', selectedId],
    queryFn : () => api.get(`/reports/sales/${selectedId}`).then(r => r.data),
    enabled : !!selectedId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sales', page, status, searchCustomer, searchProducer],
    queryFn : () => api.get(`/reports/sales?page=${page}&limit=${LIMIT}${status ? `&status=${status}` : ''}${searchCustomer ? `&customer=${encodeURIComponent(searchCustomer)}` : ''}${searchProducer ? `&producer=${encodeURIComponent(searchProducer)}` : ''}`).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const syncMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/gateway/sync/${orderId}`).then(r => r.data),
    onSuccess: (result, orderId) => {
      setSyncingId(null);
      if (result.updated) {
        toast.success(`Pedido atualizado: ${result.localStatus}`);
        queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      } else {
        toast(result.reason || 'Nenhuma atualização necessária', { icon: 'ℹ️' });
      }
    },
    onError: (err: any) => {
      setSyncingId(null);
      toast.error(err?.response?.data?.message || 'Erro ao sincronizar pedido');
    },
  });

  const handleSync = (orderId: string) => {
    setSyncingId(orderId);
    syncMutation.mutate(orderId);
  };

  const orders: Order[]  = data?.data  || [];
  const total: number    = data?.total || 0;
  const totalPages       = Math.ceil(total / LIMIT);

  // KPIs por status (derivados da resposta da API quando disponíveis)
  const kpis = useMemo(() => {
    const acc = { APPROVED: 0, PENDING: 0, REJECTED: 0, CHARGEBACK: 0, REFUNDED: 0 };
    const cents = { ...acc };
    for (const o of orders) {
      const s = o.status as keyof typeof acc;
      if (s in acc) { acc[s]++; cents[s] += o.amountCents; }
    }
    return { acc, cents };
  }, [orders]);

  return (
    <div>
      <PageHeader title="Vendas" sub="Histórico completo de pedidos" />

      {/* 5 KPIs estilo concorrente */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {[
          { key: 'APPROVED'  , label: 'Pago'        , icon: CheckCircle  , color: 'text-green'  },
          { key: 'PENDING'   , label: 'Pendente'    , icon: Clock        , color: 'text-amber'  },
          { key: 'REJECTED'  , label: 'Falhou'      , icon: XCircle      , color: 'text-red'    },
          { key: 'CHARGEBACK', label: 'Chargeback'  , icon: AlertTriangle, color: 'text-red'    },
          { key: 'REFUNDED'  , label: 'Reembolsado' , icon: RotateCcw    , color: 'text-text2'  },
        ].map(k => (
          <button
            key={k.key}
            onClick={() => { setStatus(k.key); setPage(1); }}
            className={`card p-3 text-left border ${status === k.key ? 'border-accent' : 'border-border'}`}
          >
            <div className="flex items-center justify-between text-[10px] text-text3">
              <span className="flex items-center gap-1"><k.icon size={11} className={k.color} />{k.label}</span>
              <span>{(kpis.acc as any)[k.key] || 0}/{total}</span>
            </div>
            <div className={`text-base font-bold mt-1 ${k.color}`}>{formatBRL((kpis.cents as any)[k.key] || 0)}</div>
          </button>
        ))}
      </div>

      {/* Filtros expandidos */}
      <div className="card p-3 mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input input-sm"
        >
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label || 'Todas'}</option>)}
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            value={searchCustomer}
            onChange={e => setSearchCustomer(e.target.value)}
            placeholder="Email/Nome do cliente"
            className="input input-sm pl-8 w-full"
          />
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            value={searchProducer}
            onChange={e => setSearchProducer(e.target.value)}
            placeholder="Email/Nome do produtor"
            className="input input-sm pl-8 w-full"
          />
        </div>
      </div>

      {isLoading ? <Loading /> : orders.length === 0 ? (
        <EmptyState icon={<ShoppingCart size={32} />} title="Nenhuma venda" />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Produto</th>
                  <th>Valor</th><th>Status</th><th>Adquirente</th><th>Data</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  return (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-bg3/50 transition-colors"
                    onClick={() => setSelectedId(o.id)}
                    title="Clique para ver quem vendeu, cliente, comissão do afiliado e splits"
                  >
                    <td><code className="text-xs bg-bg3 px-1.5 py-0.5 rounded text-text2">{o.id.slice(-8).toUpperCase()}</code></td>
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="text-text truncate">{o.customerName || '—'}</div>
                          {o.customerEmail && <div className="text-[10px] text-text3 truncate">{o.customerEmail}</div>}
                        </div>
                        <WhatsAppLink phone={(o as any).customerPhone} />
                      </div>
                    </td>
                    <td className="text-text2">{o.offer?.product?.name || '—'}</td>
                    <td className="font-semibold text-text">{formatBRL(o.amountCents)}</td>
                    <td><span className={orderStatusVariant(o.status)}>{o.status}</span></td>
                    <td><span className="badge-gray">{o.acquirer || '—'}</span></td>
                    <td><DateCell date={o.createdAt} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {(o.status === 'PROCESSING' || o.status === 'PENDING') && o.acquirerTxId && (
                        <button
                          onClick={() => handleSync(o.id)}
                          disabled={syncingId === o.id}
                          className="btn-ghost btn-sm text-text3 hover:text-accent"
                          title="Sincronizar status com o adquirente"
                        >
                          <RefreshCw size={13} className={syncingId === o.id ? 'animate-spin' : ''} />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal detalhes do pedido — mostra quem vendeu (produtor + afiliado), cliente, splits */}
          {selectedId && (
            <Modal
              open={!!selectedId}
              onClose={() => setSelectedId(null)}
              title={`Pedido #${selectedId.slice(-8).toUpperCase()}`}
              size="lg"
              footer={
                <div className="flex justify-end w-full">
                  <button className="btn-ghost btn-sm" onClick={() => setSelectedId(null)}>Fechar</button>
                </div>
              }
            >
              {loadingDetail || !detail ? (
                <Loading />
              ) : (
                <div className="space-y-4">
                  {/* Status + valor + método topo */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={orderStatusVariant(detail.order.status)}>{detail.order.status}</span>
                    <span className="text-lg font-bold text-text">{formatBRL(detail.order.amountCents)}</span>
                    <span className="badge-gray">{detail.order.paymentMethod}</span>
                    {detail.order.acquirer && <span className="badge-gray">{detail.order.acquirer}</span>}
                    {detail.order.couponCode && <span className="badge-blue">Cupom: {detail.order.couponCode}</span>}
                  </div>

                  {/* Produto */}
                  <section className="card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={14} className="text-accent" />
                      <h4 className="font-semibold text-sm text-text">Produto</h4>
                    </div>
                    <div className="text-text2 text-sm">{detail.order.offer?.product?.name || '—'}</div>
                    <div className="text-[11px] text-text3 mt-1">Oferta: {detail.order.offer?.name || detail.order.offerId}</div>
                  </section>

                  {/* Quem VENDEU — produtor + afiliado */}
                  <section className="card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} className="text-accent" />
                      <h4 className="font-semibold text-sm text-text">Quem vendeu</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-text3 uppercase font-semibold">Produtor</div>
                        <div className="text-text mt-1">{detail.order.offer?.product?.producer?.user?.name || '—'}</div>
                        <div className="text-[11px] text-text3">{detail.order.offer?.product?.producer?.user?.email || '—'}</div>
                        {detail.order.offer?.product?.producer?.user?.phone && (
                          <div className="mt-1"><WhatsAppLink phone={detail.order.offer.product.producer.user.phone} /></div>
                        )}
                      </div>
                      {detail.order.affiliate ? (
                        <div>
                          <div className="text-[10px] text-text3 uppercase font-semibold">Afiliado (indicou a venda)</div>
                          <div className="text-text mt-1">{detail.order.affiliate.user.name}</div>
                          <div className="text-[11px] text-text3">{detail.order.affiliate.user.email}</div>
                          <div className="text-[11px] text-accent mt-1">Código: {detail.order.affiliate.code}</div>
                          {detail.order.affiliate.user.phone && (
                            <div className="mt-1"><WhatsAppLink phone={detail.order.affiliate.user.phone} /></div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-[10px] text-text3 uppercase font-semibold">Afiliado</div>
                          <div className="text-text3 text-sm italic mt-1">Venda direta (sem afiliado)</div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Cliente */}
                  <section className="card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} className="text-accent" />
                      <h4 className="font-semibold text-sm text-text">Cliente (comprador)</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div><span className="text-text3 text-xs">Nome: </span><span className="text-text">{detail.order.customerName || '—'}</span></div>
                      <div className="flex items-center gap-2">
                        <span className="text-text3 text-xs">Email: </span><span className="text-text truncate">{detail.order.customerEmail || '—'}</span>
                        {detail.order.customerEmail && (
                          <button onClick={() => { navigator.clipboard.writeText(detail.order.customerEmail); toast.success('Copiado'); }} className="text-text3 hover:text-accent"><Copy size={11} /></button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text3 text-xs">Telefone: </span>
                        <span className="text-text">{detail.order.customerPhone || '—'}</span>
                        <WhatsAppLink phone={detail.order.customerPhone} />
                      </div>
                      <div><span className="text-text3 text-xs">CPF/CNPJ: </span><span className="text-text font-mono text-xs">{detail.order.customerDoc || '—'}</span></div>
                    </div>
                  </section>

                  {/* Splits — quem recebeu quanto */}
                  {detail.splits && detail.splits.length > 0 && (
                    <section className="card p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={14} className="text-accent" />
                        <h4 className="font-semibold text-sm text-text">Distribuição do pagamento</h4>
                      </div>
                      <table className="table w-full text-sm">
                        <thead>
                          <tr>
                            <th>Recebedor</th>
                            <th>Tipo</th>
                            <th className="text-right">Valor</th>
                            <th>Status</th>
                            <th>Libera em</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.splits.map((s: any) => (
                            <tr key={s.id}>
                              <td>
                                <div className="text-text">{s.recipientName}</div>
                                {s.recipientEmail && <div className="text-[10px] text-text3">{s.recipientEmail}</div>}
                              </td>
                              <td>
                                <span className={
                                  s.recipientType === 'PLATFORM'   ? 'badge-purple' :
                                  s.recipientType === 'PRODUCER'   ? 'badge-blue'   :
                                  s.recipientType === 'COPRODUCER' ? 'badge-green'  :
                                                                     'badge-amber'
                                }>{s.recipientType}</span>
                              </td>
                              <td className="text-right font-semibold text-text">{formatBRL(s.amountCents)}</td>
                              <td><span className={orderStatusVariant(s.status)}>{s.status}</span></td>
                              <td className="text-[11px] text-text3"><DateCell date={s.availableAt} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}

                  {/* IDs pra copiar/debug */}
                  <div className="text-[10px] text-text3 font-mono space-y-0.5">
                    <div>Order ID: {detail.order.id}</div>
                    {detail.order.acquirerTxId && <div>TX ID: {detail.order.acquirerTxId}</div>}
                  </div>
                </div>
              )}
            </Modal>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-text3">
                Página {page} de {totalPages} — {total} pedidos
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-sec btn-sm disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-sec btn-sm disabled:opacity-40"
                >
                  Próxima <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}