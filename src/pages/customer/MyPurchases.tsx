import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatBRL, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import {
  ShoppingBag, Package, Zap, CreditCard, FileText,
  ExternalLink, RotateCcw, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';

const METHOD_ICON: Record<string, React.ReactNode> = {
  PIX        : <Zap size={13} className="text-green" />,
  CREDIT_CARD: <CreditCard size={13} className="text-accent" />,
  BOLETO     : <FileText size={13} className="text-amber" />,
};

const METHOD_LABEL: Record<string, string> = {
  PIX        : 'Pix',
  CREDIT_CARD: 'Cartão',
  BOLETO     : 'Boleto',
};

const REFUND_REASONS = [
  'Produto não entregue',
  'Produto diferente do anunciado',
  'Compra não autorizada',
  'Produto com defeito ou incompleto',
  'Arrependimento de compra',
  'Outro motivo',
];

export default function MyPurchases() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Controla qual pedido tem o form de devolução aberto
  const [refundOpen, setRefundOpen]   = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundCustom, setRefundCustom] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn : () => api.get('/customer/orders').then(r => r.data),
    enabled : isAuthenticated(),
  });

  const refundMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.post(`/customer/orders/${orderId}/refund-request`, { reason }),
    onSuccess: () => {
      toast.success('Solicitação de devolução enviada! Entraremos em contato.');
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      setRefundOpen(null);
      setRefundReason('');
      setRefundCustom('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao enviar solicitação');
    },
  });

  function handleRefundSubmit(orderId: string) {
    const finalReason = refundReason === 'Outro motivo'
      ? refundCustom.trim()
      : refundReason;
    if (!finalReason || finalReason.length < 5) {
      toast.error('Descreva o motivo da devolução');
      return;
    }
    refundMutation.mutate({ orderId, reason: finalReason });
  }

  function toggleRefundForm(orderId: string) {
    if (refundOpen === orderId) {
      setRefundOpen(null);
      setRefundReason('');
      setRefundCustom('');
    } else {
      setRefundOpen(orderId);
      setRefundReason('');
      setRefundCustom('');
    }
  }

  if (!isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-5">
          <ShoppingBag size={28} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-text mb-2">Entre para ver seus pedidos</h2>
        <p className="text-sm text-text3 mb-6">Crie sua conta ou faça login para acompanhar todas as suas compras.</p>
        <button onClick={() => navigate('/cliente/login')} className="btn-primary">
          Entrar ou criar conta
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-bg3" />
        ))}
      </div>
    );
  }

  // Pedidos aprovados ou reembolsados (reembolsados ainda aparecem para acompanhar)
  const orders = (data?.data || []).filter((o: any) => o.status === 'APPROVED' || o.status === 'REFUNDED');

  function refundDaysLeft(order: any): number | null {
    const guaranteeDays = order.offer?.checkoutConfig?.guaranteeDays ?? 30;
    const base = order.approvedAt ?? order.createdAt;
    if (!base) return null;
    const windowEnd = new Date(base);
    windowEnd.setDate(windowEnd.getDate() + guaranteeDays);
    const diff = Math.ceil((windowEnd.getTime() - Date.now()) / 86_400_000);
    return diff;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Minhas compras</h1>
        <p className="text-sm text-text3 mt-0.5">Seus pedidos confirmados</p>
      </div>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-bg3 rounded-2xl flex items-center justify-center mb-4">
            <Package size={26} className="text-text3" />
          </div>
          <p className="text-text font-medium mb-1">Nenhuma compra encontrada</p>
          <p className="text-text3 text-sm mb-6">Quando você fizer uma compra aprovada, ela aparecerá aqui.</p>
          <button onClick={() => navigate('/cliente/marketplace')} className="btn-secondary">
            Ver produtos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => {
            const refundRequest    = (order.metadata as any)?.refundRequest;
            const alreadyRequested = !!refundRequest;
            const isRefundOpen     = refundOpen === order.id;
            const daysLeft         = refundDaysLeft(order);
            const isRefunded       = order.status === 'REFUNDED';

            return (
              <div key={order.id} className="card p-0 overflow-hidden">

                {/* Linha principal */}
                <div className="flex items-center gap-4 p-4">
                  {/* Imagem */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-bg3">
                    {order.offer?.product?.imageUrl ? (
                      <img src={order.offer.product.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={22} className="text-text3" />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text truncate text-sm">
                          {order.offer?.product?.name || order.offer?.name || '—'}
                        </p>
                        <p className="text-xs text-text3 mt-0.5">{formatDate(order.createdAt)}</p>
                      </div>
                      <span className="text-sm font-bold text-text flex-shrink-0">
                        {formatBRL(order.amountCents)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {order.paymentMethod && (
                        <span className="flex items-center gap-1 text-[11px] text-text3">
                          {METHOD_ICON[order.paymentMethod]}
                          {METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
                        </span>
                      )}
                      <span className="text-[11px] text-text3 font-mono">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>

                      {/* Produto digital — link de acesso */}
                      {order.offer?.product?.type === 'DIGITAL' && order.offer?.product?.digitalUrl && (
                        <a
                          href={order.offer.product.digitalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-accent hover:underline"
                        >
                          <ExternalLink size={11} />
                          Acessar produto
                        </a>
                      )}

                      {/* Reembolso concluído */}
                      {isRefunded && (
                        <span className="flex items-center gap-1 text-[11px] text-green font-medium">
                          <RotateCcw size={11} />
                          Reembolso processado
                        </span>
                      )}

                      {/* Devolução solicitada / em análise */}
                      {!isRefunded && alreadyRequested && (
                        <span className="flex items-center gap-1 text-[11px] text-amber font-medium">
                          <AlertTriangle size={11} />
                          {refundRequest?.status === 'PROCESSED' ? 'Reembolso processado' : 'Devolução em análise'}
                        </span>
                      )}

                      {/* Dias restantes para solicitar devolução */}
                      {!isRefunded && !alreadyRequested && daysLeft !== null && daysLeft > 0 && (
                        <span className="text-[11px] text-text3">
                          {daysLeft}d p/ reembolso
                        </span>
                      )}

                      {/* Botão de devolução */}
                      {!alreadyRequested && !isRefunded && daysLeft !== null && daysLeft > 0 && (
                        <button
                          onClick={() => toggleRefundForm(order.id)}
                          className="flex items-center gap-1 text-[11px] text-text3 hover:text-red transition-colors ml-auto"
                        >
                          <RotateCcw size={11} />
                          Pedir devolução
                          {isRefundOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form de devolução — inline collapse */}
                {isRefundOpen && (
                  <div className="border-t border-border bg-bg3/50 px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-amber flex-shrink-0" />
                      <p className="text-sm font-medium text-text">Solicitar devolução</p>
                    </div>
                    <p className="text-xs text-text3 leading-relaxed">
                      Selecione o motivo. Nossa equipe analisará sua solicitação em até 5 dias úteis.
                    </p>

                    {/* Motivos */}
                    <div className="space-y-1.5">
                      {REFUND_REASONS.map(r => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            refundReason === r ? 'border-accent bg-accent' : 'border-border group-hover:border-accent/50'
                          }`}>
                            {refundReason === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name={`reason-${order.id}`}
                            value={r}
                            checked={refundReason === r}
                            onChange={() => { setRefundReason(r); setRefundCustom(''); }}
                            className="sr-only"
                          />
                          <span className="text-sm text-text2">{r}</span>
                        </label>
                      ))}
                    </div>

                    {/* Campo livre para "Outro motivo" */}
                    {refundReason === 'Outro motivo' && (
                      <textarea
                        value={refundCustom}
                        onChange={e => setRefundCustom(e.target.value)}
                        className="input w-full resize-none text-sm"
                        rows={3}
                        placeholder="Descreva o motivo da devolução..."
                        maxLength={500}
                      />
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleRefundSubmit(order.id)}
                        disabled={refundMutation.isPending || !refundReason}
                        className="btn-primary py-2 text-xs disabled:opacity-50"
                      >
                        {refundMutation.isPending ? 'Enviando...' : 'Confirmar solicitação'}
                      </button>
                      <button
                        onClick={() => toggleRefundForm(order.id)}
                        className="btn-secondary py-2 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
