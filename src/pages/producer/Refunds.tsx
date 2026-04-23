import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import { RotateCcw, AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  REFUNDED      : { label: 'Reembolsado',    className: 'badge-red'    },
  CHARGEBACK    : { label: 'Chargeback',      className: 'badge-red'    },
  PENDING_REFUND: { label: 'Aguard. análise', className: 'badge-amber'  },
};

export default function ProducerRefunds() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['producer-refunds', page],
    queryFn : () => api.get(`/producers/refunds?page=${page}&limit=${limit}`).then(r => r.data),
  });

  const orders    = data?.data    || [];
  const total     = data?.total   || 0;
  const counts    = data?.counts  || {};
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader title="Reembolsos & Chargebacks" sub="Acompanhe todas as solicitações de reembolso e contestações" />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
            <RotateCcw size={16} className="text-red" />
          </div>
          <div>
            <p className="text-[11px] text-text3">Reembolsos</p>
            <p className="text-xl font-bold text-text">{counts.refunded ?? 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red" />
          </div>
          <div>
            <p className="text-[11px] text-text3">Chargebacks</p>
            <p className="text-xl font-bold text-text">{counts.chargebacks ?? 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber/10 flex items-center justify-center flex-shrink-0">
            <Clock size={16} className="text-amber" />
          </div>
          <div>
            <p className="text-[11px] text-text3">Aguardando análise</p>
            <p className="text-xl font-bold text-text">{counts.pendingReview ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="section-title mb-4">Histórico de ocorrências</div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state py-12">
            <RotateCcw size={28} className="text-text2 mb-2" />
            <p className="text-text2 text-sm">Nenhum reembolso ou chargeback registrado.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Produto</th>
                    <th>Cliente</th>
                    <th>Afiliado</th>
                    <th>Valor</th>
                    <th>Tipo</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => {
                    const st = STATUS_LABEL[o.displayStatus] || { label: o.displayStatus, className: 'badge-blue' };
                    return (
                      <tr key={`${o.id}-${o.displayStatus}`}>
                        <td className="font-mono text-xs text-text3">{o.id.slice(0, 8)}…</td>
                        <td>{o.offer?.product?.name || '—'}</td>
                        <td>{o.customerName || '—'}</td>
                        <td>{o.affiliate?.user?.name || <span className="text-text3">Direto</span>}</td>
                        <td className="font-semibold">{formatBRL(o.amountCents)}</td>
                        <td><span className={st.className}>{st.label}</span></td>
                        <td className="text-text3 text-xs">{formatDate(o.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-text3">{total} ocorrências no total</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-text2">
                    {page} / {totalPages}
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
