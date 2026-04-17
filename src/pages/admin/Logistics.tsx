import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Loading } from '@/components/ui';
import { formatBRL, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Truck, Package, Clock, CheckCircle, RotateCcw, Send,
  Settings, Key, Save, ChevronDown, ChevronUp, MapPin, PackageSearch,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  WAITING   : { label: 'Aguardando',  badge: 'badge-gray' },
  DISPATCHED: { label: 'Despachado',  badge: 'badge-blue' },
  IN_TRANSIT: { label: 'Em trânsito', badge: 'badge-yellow' },
  DELIVERED : { label: 'Entregue',    badge: 'badge-green' },
  RETURNED  : { label: 'Devolvido',   badge: 'badge-red' },
};

export default function AdminLogistics() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'orders' | 'config'>('orders');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logistics'],
    queryFn : () => api.get('/logistics/orders?limit=100').then(r => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn : () => api.get('/admin/settings').then(r => r.data).catch(() => ({})),
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

  const shipments = data?.data || [];
  const counts = {
    total    : shipments.length,
    waiting  : shipments.filter((s: any) => s.status === 'WAITING').length,
    transit  : shipments.filter((s: any) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT').length,
    delivered: shipments.filter((s: any) => s.status === 'DELIVERED').length,
    returned : shipments.filter((s: any) => s.status === 'RETURNED').length,
  };

  return (
    <div>
      <PageHeader title="Logística & Jadlog" sub="Gestão de envios e configuração da transportadora" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('orders')}
          className={`btn-sm ${tab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Truck size={13} /> Envios ({counts.total})
        </button>
        <button
          onClick={() => setTab('config')}
          className={`btn-sm ${tab === 'config' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Settings size={13} /> Configurar Jadlog
        </button>
      </div>

      {tab === 'orders' && (
        <OrdersTab
          shipments={shipments}
          counts={counts}
          isLoading={isLoading}
          expandedId={expandedId}
          trackingData={trackingData}
          toggleTracking={toggleTracking}
        />
      )}

      {tab === 'config' && <ConfigTab settings={settings} />}
    </div>
  );
}

// ── Orders Tab ───────────────────────────────────────────────────

function OrdersTab({ shipments, counts, isLoading, expandedId, trackingData, toggleTracking }: any) {
  if (isLoading) return <Loading />;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-amber">{counts.waiting}</p>
          <p className="text-[11px] text-text3">Aguardando</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-accent">{counts.transit}</p>
          <p className="text-[11px] text-text3">Em trânsito</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-green">{counts.delivered}</p>
          <p className="text-[11px] text-text3">Entregues</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-red">{counts.returned}</p>
          <p className="text-[11px] text-text3">Devolvidos</p>
        </div>
      </div>

      {/* Tabela */}
      {shipments.length === 0 ? (
        <div className="card text-center py-12">
          <Truck size={28} className="text-text3 mx-auto mb-3" />
          <p className="text-text font-medium">Nenhum envio registrado</p>
          <p className="text-text3 text-sm mt-1">Vendas de produtos físicos aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Transportadora</th>
                <th>Rastreio</th>
                <th>Status</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s: any) => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.WAITING;
                const isExpanded = expandedId === s.orderId;

                return (
                  <>
                    <tr key={s.id} className="hover:bg-bg3/50">
                      <td className="font-mono text-xs">#{s.orderId?.slice(-8).toUpperCase()}</td>
                      <td className="text-sm">{s.order?.customerName || '—'}</td>
                      <td className="text-sm">{s.carrier || '—'}</td>
                      <td>
                        {s.trackingCode
                          ? <code className="text-xs bg-bg3 px-2 py-0.5 rounded">{s.trackingCode}</code>
                          : <span className="text-text3 text-xs">—</span>}
                      </td>
                      <td><span className={cfg.badge}>{cfg.label}</span></td>
                      <td className="text-xs text-text3">{formatDate(s.createdAt)}</td>
                      <td>
                        {s.status !== 'WAITING' && (
                          <button
                            onClick={() => toggleTracking(s.orderId)}
                            className="btn-ghost btn-sm text-xs"
                          >
                            <Truck size={12} />
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-track`}>
                        <td colSpan={7} className="p-0">
                          <TrackingInline data={trackingData[s.orderId]} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Config Tab ───────────────────────────────────────────────────

function ConfigTab({ settings }: { settings: any }) {
  const jadlog = settings?.jadlog || {};

  const [form, setForm] = useState({
    token       : jadlog.token        || '',
    codCliente  : jadlog.codCliente   || '',
    cnpj        : jadlog.cnpj         || '',
    conta       : jadlog.conta        || '',
    cepOrigem   : jadlog.cepOrigem    || '',
    modalidade  : jadlog.modalidade   || '3',
    remNome     : jadlog.remNome      || '',
    remEndereco : jadlog.remEndereco  || '',
    remNumero   : jadlog.remNumero    || '',
    remBairro   : jadlog.remBairro    || '',
    remCidade   : jadlog.remCidade    || '',
    remUf       : jadlog.remUf        || '',
    remEmail    : jadlog.remEmail     || '',
    remFone     : jadlog.remFone      || '',
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/admin/settings', { jadlog: form }),
    onSuccess : () => toast.success('Configurações Jadlog salvas!'),
    onError   : (err: any) => toast.error(err?.response?.data?.message || 'Erro ao salvar'),
  });

  const isConfigured = !!(form.token && form.codCliente && form.cnpj && form.cepOrigem);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Status */}
      <div className={`card flex items-center gap-3 ${isConfigured ? 'border-green/30' : 'border-amber/30'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConfigured ? 'bg-green/10' : 'bg-amber/10'}`}>
          {isConfigured ? <CheckCircle size={18} className="text-green" /> : <Key size={18} className="text-amber" />}
        </div>
        <div>
          <p className="text-sm font-medium text-text">
            {isConfigured ? 'Jadlog configurada' : 'Jadlog pendente de configuracao'}
          </p>
          <p className="text-xs text-text3">
            {isConfigured
              ? 'Todos os campos obrigatorios estao preenchidos. Os envios usarao a API Jadlog.'
              : 'Preencha Token, Codigo do Cliente, CNPJ e CEP de Origem para ativar.'}
          </p>
        </div>
      </div>

      {/* Chaves de API */}
      <div className="card">
        <div className="section-title mb-4 flex items-center gap-2">
          <Key size={14} /> Credenciais da API Jadlog
        </div>
        <div className="space-y-3">
          <div className="form-group">
            <label className="label">Token de autenticacao *</label>
            <input
              value={form.token}
              onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
              className="input font-mono text-xs"
              placeholder="Token fornecido pela Jadlog"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Codigo do Cliente *</label>
              <input
                value={form.codCliente}
                onChange={e => setForm(f => ({ ...f, codCliente: e.target.value }))}
                className="input"
                placeholder="000000"
              />
            </div>
            <div className="form-group">
              <label className="label">Conta Corrente</label>
              <input
                value={form.conta}
                onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                className="input"
                placeholder="Se correntista"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">CNPJ do tomador *</label>
              <input
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                className="input"
                placeholder="00.000.000/0001-00"
                maxLength={18}
              />
            </div>
            <div className="form-group">
              <label className="label">Modalidade padrao</label>
              <select
                value={form.modalidade}
                onChange={e => setForm(f => ({ ...f, modalidade: e.target.value }))}
                className="input"
              >
                <option value="3">.PACKAGE (Rodoviario)</option>
                <option value="0">EXPRESSO (Aereo)</option>
                <option value="5">ECONOMICO (Rodoviario)</option>
                <option value="4">RODOVIARIO</option>
                <option value="9">.COM (Aereo)</option>
                <option value="40">PICKUP (Aereo)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do remetente */}
      <div className="card">
        <div className="section-title mb-4 flex items-center gap-2">
          <Package size={14} /> Dados do Remetente
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Nome / Razao Social</label>
              <input value={form.remNome} onChange={e => setForm(f => ({ ...f, remNome: e.target.value }))} className="input" placeholder="Kairos Way" />
            </div>
            <div className="form-group">
              <label className="label">CEP de Origem *</label>
              <input value={form.cepOrigem} onChange={e => setForm(f => ({ ...f, cepOrigem: e.target.value }))} className="input" placeholder="01001000" maxLength={9} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group col-span-2">
              <label className="label">Endereco</label>
              <input value={form.remEndereco} onChange={e => setForm(f => ({ ...f, remEndereco: e.target.value }))} className="input" placeholder="Rua..." />
            </div>
            <div className="form-group">
              <label className="label">Numero</label>
              <input value={form.remNumero} onChange={e => setForm(f => ({ ...f, remNumero: e.target.value }))} className="input" placeholder="123" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group">
              <label className="label">Bairro</label>
              <input value={form.remBairro} onChange={e => setForm(f => ({ ...f, remBairro: e.target.value }))} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Cidade</label>
              <input value={form.remCidade} onChange={e => setForm(f => ({ ...f, remCidade: e.target.value }))} className="input" />
            </div>
            <div className="form-group">
              <label className="label">UF</label>
              <input value={form.remUf} onChange={e => setForm(f => ({ ...f, remUf: e.target.value }))} className="input" placeholder="SP" maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Email</label>
              <input value={form.remEmail} onChange={e => setForm(f => ({ ...f, remEmail: e.target.value }))} className="input" type="email" />
            </div>
            <div className="form-group">
              <label className="label">Telefone</label>
              <input value={form.remFone} onChange={e => setForm(f => ({ ...f, remFone: e.target.value }))} className="input" placeholder="(11) 99999-9999" />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn-primary w-full justify-center"
      >
        {saveMutation.isPending
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
          : <><Save size={14} /> Salvar configuracoes Jadlog</>}
      </button>
    </div>
  );
}

// ── Tracking Inline ─────────────────────────────────────────────

function TrackingInline({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="bg-bg3/50 px-4 py-4 text-center">
        <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
      </div>
    );
  }

  const eventos  = data.jadlogTracking?.eventos || [];
  const previsao = data.previsaoEntrega || data.estimatedAt;

  return (
    <div className="bg-bg3/50 px-4 py-3 space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-text2 font-medium">{data.carrier || 'JADLOG'}</span>
        {data.trackingCode && <code className="bg-bg2 px-2 py-0.5 rounded text-text3">{data.trackingCode}</code>}
        {previsao && data.status !== 'DELIVERED' && (
          <span className="flex items-center gap-1 text-text3">
            <MapPin size={10} /> Previsao: {new Date(previsao).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
      {eventos.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {eventos.slice().reverse().slice(0, 5).map((ev: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-accent' : 'bg-border'}`} />
              <span className="text-text2">{ev.status}</span>
              <span className="text-text3">{ev.data ? new Date(ev.data.replace(' ', 'T')).toLocaleDateString('pt-BR') : ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-text3">Sem eventos de rastreamento ainda.</p>
      )}
    </div>
  );
}
