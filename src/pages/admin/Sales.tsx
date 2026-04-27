import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState, DateCell, WhatsAppLink } from '@/components/ui';
import { formatBRL, orderStatusVariant } from '@/lib/utils';
import type { Order } from '@/types';
import { ShoppingCart, ChevronLeft, ChevronRight, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle, RotateCcw, Search } from 'lucide-react';
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
  const queryClient = useQueryClient();

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
                  <tr key={o.id}>
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
                    <td>
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