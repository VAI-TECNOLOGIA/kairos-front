import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { FlaskConical, Search, CheckCircle, Send, AlertTriangle } from 'lucide-react';

interface OrderInfo {
  id           : string;
  status       : string;
  customerName : string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  amountCents  : number;
  productName  : string;
  digitalUrl   : string | null;
}

export default function TestEnvironmentPage() {
  const [code, setCode]         = useState('');
  const [order, setOrder]       = useState<OrderInfo | null>(null);
  const [searching, setSearching] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('vaitecnologialp@gmail.com');

  // Buscar pedido
  const searchOrder = async () => {
    if (!code.trim()) return;
    setSearching(true);
    setOrder(null);
    try {
      const { data } = await api.get(`/admin/test/order/${code.trim().toLowerCase()}`);
      setOrder(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Pedido não encontrado');
    } finally {
      setSearching(false);
    }
  };

  // Forçar APPROVED + disparar notificações
  const approveMutation = useMutation({
    mutationFn: () => api.post('/admin/test/approve', {
      orderId      : order!.id,
      overrideEmail,
    }),
    onSuccess: (res) => {
      toast.success('Pedido aprovado e notificações disparadas!');
      setOrder(prev => prev ? { ...prev, status: 'APPROVED' } : prev);
      console.log('Resultado:', res.data);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const formatBRL = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const methodLabel: Record<string, string> = {
    PIX        : 'Pix',
    CREDIT_CARD: 'Cartão de crédito',
    BOLETO     : 'Boleto',
  };

  return (
    <div>
      <PageHeader
        title="Ambiente de Teste"
        sub="Simule aprovações de pagamento e valide o envio de notificações"
      />

      {/* Aviso */}
      <div className="flex items-start gap-3 bg-amber/10 border border-amber/30 rounded-[10px] p-4 mb-6">
        <AlertTriangle size={18} className="text-amber flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber/90">
          <strong>Ambiente de testes — use apenas para validação.</strong>{' '}
          Ao forçar a aprovação, o sistema dispara WhatsApp e e-mail como se fosse uma compra real.
          O e-mail de destino é substituído abaixo para evitar envio ao cliente final.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Buscar pedido */}
        <div className="card">
          <div className="section-title mb-4">1. Buscar pedido pelo código</div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && searchOrder()}
              className="input flex-1 font-mono tracking-widest"
              placeholder="Ex: 91A0EGG1"
              maxLength={8}
            />
            <button
              onClick={searchOrder}
              disabled={searching || !code.trim()}
              className="btn-primary btn-sm px-4"
            >
              {searching ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search size={15} />
              )}
            </button>
          </div>

          {order && (
            <div className="mt-4 space-y-2 bg-bg3 rounded-[10px] p-4 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text3">Status</span>
                <span className={`badge ${order.status === 'APPROVED' ? 'badge-green' : order.status === 'PROCESSING' ? 'badge-blue' : 'badge-amber'}`}>
                  {order.status}
                </span>
              </div>
              {[
                ['Cliente',   order.customerName],
                ['Email',     order.customerEmail],
                ['Telefone',  order.customerPhone || '—'],
                ['Produto',   order.productName],
                ['Método',    methodLabel[order.paymentMethod] || order.paymentMethod],
                ['Valor',     formatBRL(order.amountCents)],
                ['Link',      order.digitalUrl || '⚠ Produto sem link digital'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-text3">{k}</span>
                  <span className={`text-text font-medium text-right max-w-[200px] truncate ${k === 'Link' && !order.digitalUrl ? 'text-amber' : ''}`}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aprovar e disparar */}
        <div className="card">
          <div className="section-title mb-4">2. Aprovar e disparar notificações</div>

          {!order ? (
            <div className="text-sm text-text3 text-center py-8">
              Busque um pedido primeiro
            </div>
          ) : (
            <div className="space-y-4">
              {/* Override de email */}
              <div className="form-group">
                <label className="label">E-mail de destino do teste</label>
                <input
                  value={overrideEmail}
                  onChange={e => setOverrideEmail(e.target.value)}
                  className="input"
                  placeholder="email@teste.com"
                  type="email"
                />
                <p className="text-xs text-text3 mt-1">
                  O e-mail do cliente será substituído por este para o disparo de teste
                </p>
              </div>

              {/* O que será disparado */}
              <div className="bg-bg3 rounded-[10px] p-3 space-y-2 border border-border">
                <p className="text-xs font-semibold text-text2 mb-2">O que será executado:</p>
                <div className="flex items-center gap-2 text-sm text-text2">
                  <CheckCircle size={13} className="text-green" />
                  Pedido marcado como APPROVED
                </div>
                <div className="flex items-center gap-2 text-sm text-text2">
                  <Send size={13} className="text-accent" />
                  E-mail enviado para <strong>{overrideEmail}</strong>
                </div>
                {order.customerPhone && order.digitalUrl && (
                  <div className="flex items-center gap-2 text-sm text-text2">
                    <Send size={13} className="text-green" />
                    WhatsApp enviado para {order.customerPhone}
                  </div>
                )}
                {!order.digitalUrl && (
                  <div className="flex items-center gap-2 text-sm text-amber">
                    <AlertTriangle size={13} />
                    WhatsApp não enviado — produto sem link digital
                  </div>
                )}
              </div>

              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || order.status === 'APPROVED'}
                className="btn-primary w-full justify-center py-3"
              >
                {approveMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </>
                ) : order.status === 'APPROVED' ? (
                  <><CheckCircle size={15} /> Já aprovado</>
                ) : (
                  <><CheckCircle size={15} /> Aprovar e disparar notificações</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}