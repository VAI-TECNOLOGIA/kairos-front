import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState, StatCard } from '@/components/ui';
import { formatBRL, formatDateTime, orderStatusVariant } from '@/lib/utils';
import type { Order } from '@/types';
import { ShoppingCart, TrendingUp, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sales', page, status],
    queryFn : () => api.get(`/reports/sales?page=${page}&limit=${LIMIT}${status ? `&status=${status}` : ''}`).then(r => r.data),
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

  return (
    <div>
      <PageHeader title="Vendas" sub="Histórico completo de pedidos" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de vendas"  value={total}                                                                               icon={<ShoppingCart size={16} />} />
        <StatCard label="Receita total"    value={formatBRL(data?.totalRevenueCents || 0)}                                             icon={<TrendingUp size={16} />} />
        <StatCard label="Ticket médio"     value={total ? formatBRL(Math.round((data?.totalRevenueCents || 0) / total)) : '—'} />
      </div>

      {/* Filtro por status */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              status === f.value
                ? 'bg-accent/10 border-accent text-accent font-semibold'
                : 'border-border text-text3 hover:border-accent/40 hover:text-text2'
            }`}
          >
            {f.label}
          </button>
        ))}
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
                  <th>Valor</th><th>Status</th><th>Adquirente</th><th>NF</th><th>Data</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const nfe = (o as any).metadata?.nfe;
                  return (
                  <tr key={o.id}>
                    <td><code className="text-xs bg-bg3 px-1.5 py-0.5 rounded text-text2">{o.id.slice(-8).toUpperCase()}</code></td>
                    <td className="text-text">{o.customerName || '—'}</td>
                    <td className="text-text2">{o.offer?.product?.name || '—'}</td>
                    <td className="font-semibold text-text">{formatBRL(o.amountCents)}</td>
                    <td><span className={orderStatusVariant(o.status)}>{o.status}</span></td>
                    <td><span className="badge-gray">{o.acquirer || '—'}</span></td>
                    <td>
                      {nfe?.status === 'issued' && nfe.pdfUrl ? (
                        <a href={nfe.pdfUrl} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-accent hover:underline font-medium" title="Abrir NF em PDF">
                          #{nfe.number || nfe.id?.slice(-6).toUpperCase()}
                        </a>
                      ) : nfe?.status === 'processing' ? (
                        <span className="text-text3 text-xs">processando</span>
                      ) : nfe?.status === 'failed' ? (
                        <span className="text-red-400 text-xs">erro</span>
                      ) : (
                        <span className="text-text3 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-text3">{formatDateTime(o.createdAt)}</td>
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