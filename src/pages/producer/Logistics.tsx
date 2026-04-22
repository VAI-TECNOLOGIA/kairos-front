import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Loading } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Truck, Package, Clock, CheckCircle, RotateCcw, Send,
  ChevronDown, ChevronUp, MapPin, PackageSearch, AlertTriangle,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  WAITING   : { label: 'Aguardando envio', badge: 'badge-gray',   icon: <Clock size={13} /> },
  DISPATCHED: { label: 'Despachado',       badge: 'badge-blue',   icon: <Send size={13} /> },
  IN_TRANSIT: { label: 'Em trânsito',      badge: 'badge-yellow', icon: <Truck size={13} /> },
  DELIVERED : { label: 'Entregue',         badge: 'badge-green',  icon: <CheckCircle size={13} /> },
  RETURNED  : { label: 'Devolvido',        badge: 'badge-red',    icon: <RotateCcw size={13} /> },
};

export default function ProducerLogistics() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['producer-logistics'],
    queryFn : () => api.get('/logistics/orders?limit=50').then(r => r.data),
  });

  const shipMutation = useMutation({
    mutationFn: (orderId: string) => api.post('/logistics/ship', { orderId }),
    onSuccess: () => {
      toast.success('Envio criado no Melhor Envio!');
      qc.invalidateQueries({ queryKey: ['producer-logistics'] });
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      const msg  = resp?.message || 'Erro ao criar envio';
      // Mostra toast com mensagem + log completo no console para debug
      if (resp?.meResponse) {
        console.error('[logistics] Melhor Envio response:', resp.meResponse);
      }
      toast.error(msg, { duration: 8000 });
    },
  });

  async function toggleTracking(orderId: string) {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);
    if (!trackingData[orderId]) {
      try {
        const { data: d } = await api.get(`/logistics/tracking/${orderId}`);
        setTrackingData(prev => ({ ...prev, [orderId]: d }));
      } catch {
        setTrackingData(prev => ({ ...prev, [orderId]: { status: 'WAITING' } }));
      }
    }
  }

  if (isLoading) return <Loading />;

  // O endpoint retorna Orders (não Shipments) com shipment: Shipment | null incluso.
  // Normalizamos: status efetivo = shipment.status OR 'WAITING' (ainda não despachado).
  const orders = (data?.data || []).map((o: any) => ({
    orderId       : o.id,
    customerName  : o.customerName,
    amountCents   : o.amountCents,
    createdAt     : o.createdAt,
    productName   : o.offer?.product?.name,
    shipmentStatus: o.shipment?.status || 'WAITING',
    trackingCode  : o.shipment?.trackingCode,
    shipment      : o.shipment,
    order         : { customerName: o.customerName, amountCents: o.amountCents },
  }));

  const counts = {
    waiting  : orders.filter((s: any) => s.shipmentStatus === 'WAITING').length,
    transit  : orders.filter((s: any) => s.shipmentStatus === 'DISPATCHED' || s.shipmentStatus === 'IN_TRANSIT').length,
    delivered: orders.filter((s: any) => s.shipmentStatus === 'DELIVERED').length,
  };

  return (
    <div>
      <PageHeader title="Envios" sub="Gerencie envios dos seus produtos físicos via Melhor Envio" />

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-amber">{counts.waiting}</p>
          <p className="text-[11px] text-text3">Aguardando envio</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-accent">{counts.transit}</p>
          <p className="text-[11px] text-text3">Em trânsito</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-green">{counts.delivered}</p>
          <p className="text-[11px] text-text3">Entregues</p>
        </div>
      </div>

      {/* Lista de envios */}
      {orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Truck size={22} className="text-accent" />
          </div>
          <p className="text-text font-medium mb-1">Nenhum envio registrado</p>
          <p className="text-text3 text-sm">Quando um produto físico for vendido, o envio aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((s: any) => {
            const cfg = STATUS_CONFIG[s.shipmentStatus] || STATUS_CONFIG.WAITING;
            const isExpanded = expandedId === s.orderId;
            const canDispatch = s.shipmentStatus === 'WAITING';

            return (
              <div key={s.orderId} className="card p-0 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center">
                    <Package size={18} className="text-text3" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-text">{s.customerName || '—'}</span>
                      <span className={cfg.badge}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-text3">
                      <span className="font-mono">#{s.orderId?.slice(-8).toUpperCase()}</span>
                      {s.productName && <span>{s.productName}</span>}
                      <span>{formatBRL(s.amountCents || 0)}</span>
                      {s.trackingCode && <span>Rastreio: {s.trackingCode}</span>}
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Despachar via Melhor Envio */}
                    {canDispatch && (
                      <button
                        onClick={() => shipMutation.mutate(s.orderId)}
                        disabled={shipMutation.isPending}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                      >
                        <Send size={12} />
                        {shipMutation.isPending && shipMutation.variables === s.orderId ? 'Despachando...' : 'Despachar'}
                      </button>
                    )}

                    {/* Expandir tracking */}
                    {!canDispatch && (
                      <button
                        onClick={() => toggleTracking(s.orderId)}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                      >
                        <Truck size={12} />
                        Rastrear
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking expandido */}
                {isExpanded && (
                  <TrackingDetail data={trackingData[s.orderId]} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tracking Detail ──────────────────────────────────────────────

function TrackingDetail({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="border-t border-border bg-bg3/50 px-4 py-6 text-center">
        <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
        <p className="text-xs text-text3 mt-2">Carregando rastreamento...</p>
      </div>
    );
  }

  const eventos  = data.tracking?.eventos || [];
  const previsao = data.previsaoEntrega || data.estimatedAt;
  const status   = data.status || 'WAITING';

  return (
    <div className="border-t border-border bg-bg3/50 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-accent" />
          <span className="text-sm font-medium text-text">{data.carrier || 'MELHOR_ENVIO'}</span>
          {data.trackingCode && (
            <span className="text-xs font-mono text-text3">{data.trackingCode}</span>
          )}
        </div>
        <span className={`badge-${status === 'DELIVERED' ? 'green' : status === 'IN_TRANSIT' ? 'yellow' : 'blue'}`}>
          {STATUS_CONFIG[status]?.label || status}
        </span>
      </div>

      {previsao && status !== 'DELIVERED' && (
        <div className="flex items-center gap-2 text-xs text-text2">
          <MapPin size={12} className="text-text3" />
          Previsão: <strong>{new Date(previsao).toLocaleDateString('pt-BR')}</strong>
        </div>
      )}

      {eventos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text2 flex items-center gap-1">
            <PackageSearch size={12} /> Eventos de Envio
          </p>
          {eventos.slice().reverse().map((ev: any, i: number) => (
            <div key={i} className="flex items-start gap-2 ml-1">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-accent' : 'bg-border'}`} />
              <div>
                <p className="text-xs text-text">{ev.status}</p>
                <p className="text-[10px] text-text3">
                  {ev.unidade && `${ev.unidade} — `}
                  {ev.data ? new Date(ev.data.replace(' ', 'T')).toLocaleString('pt-BR') : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {eventos.length === 0 && (
        <p className="text-xs text-text3 text-center py-2">
          Nenhum evento de rastreamento disponível ainda.
        </p>
      )}
    </div>
  );
}
