import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Loading } from '@/components/ui';
import {
  Plus, Trash2, Pencil, X, Check, ToggleLeft, ToggleRight, Activity, Code2,
} from 'lucide-react';
import { SiMeta, SiGoogleanalytics, SiGoogleads, SiTiktok } from 'react-icons/si';

// ── Ícones de plataforma ──────────────────────────────────────────

function KwaiIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.5 14.5V7.5l7 4.5-7 4.5z" />
    </svg>
  );
}

function ProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  switch (provider) {
    case 'FACEBOOK':   return <SiMeta            size={size} />;
    case 'GA4':        return <SiGoogleanalytics size={size} />;
    case 'GOOGLE_ADS': return <SiGoogleads       size={size} />;
    case 'TIKTOK':     return <SiTiktok          size={size} />;
    case 'KWAI':       return <KwaiIcon          size={size} />;
    default:           return <Code2             size={size} strokeWidth={1.5} />;
  }
}

const PROVIDERS = [
  { value: 'FACEBOOK',   label: 'Meta (Facebook)',  color: '#1877F2' },
  { value: 'GA4',        label: 'Google Analytics', color: '#E37400' },
  { value: 'GOOGLE_ADS', label: 'Google Ads',       color: '#34A853' },
  { value: 'TIKTOK',     label: 'TikTok',           color: '#ffffff' },
  { value: 'KWAI',       label: 'Kwai',             color: '#FF6600' },
  { value: 'CUSTOM',     label: 'Personalizado',    color: '#6366F1' },
] as const;

const EVENTS = [
  { value: 'ViewContent',       label: 'View Content',       desc: 'Visitou a página do produto' },
  { value: 'InitiateCheckout',  label: 'Initiate Checkout',  desc: 'Iniciou o checkout' },
  { value: 'AddPaymentInfo',    label: 'Add Payment Info',   desc: 'Preencheu dados de pagamento' },
  { value: 'Purchase',          label: 'Purchase',           desc: 'Compra concluída' },
] as const;

type Provider = typeof PROVIDERS[number]['value'];
type EventName = typeof EVENTS[number]['value'];

interface TrackingPixel {
  id       : string;
  provider : Provider;
  name     : string;
  pixelId  : string;
  isActive : boolean;
  events   : EventName[];
  createdAt: string;
}

const DEFAULT_FORM = {
  provider: 'FACEBOOK' as Provider,
  name    : '',
  pixelId : '',
  isActive: true,
  events  : ['ViewContent', 'InitiateCheckout', 'Purchase'] as EventName[],
};

function ProviderBadge({ provider }: { provider: Provider }) {
  const p = PROVIDERS.find(px => px.value === provider);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border"
      style={{ color: p?.color, borderColor: `${p?.color}33`, background: `${p?.color}12` }}
    >
      <ProviderIcon provider={provider} size={11} />
      {p?.label}
    </span>
  );
}

export default function TrackingPixels() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState({ ...DEFAULT_FORM });

  const { data: pixels = [], isLoading } = useQuery<TrackingPixel[]>({
    queryKey: ['tracking-pixels'],
    queryFn : () => api.get('/tracking').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof DEFAULT_FORM) => api.post('/tracking', data),
    onSuccess : () => {
      qc.invalidateQueries({ queryKey: ['tracking-pixels'] });
      toast.success('Pixel criado!');
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao criar pixel'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof DEFAULT_FORM> }) =>
      api.put(`/tracking/${id}`, data),
    onSuccess : () => {
      qc.invalidateQueries({ queryKey: ['tracking-pixels'] });
      toast.success('Pixel atualizado!');
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao atualizar pixel'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tracking/${id}`),
    onSuccess : () => {
      qc.invalidateQueries({ queryKey: ['tracking-pixels'] });
      toast.success('Pixel removido.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao remover pixel'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/tracking/${id}`, { isActive }),
    onSuccess : () => qc.invalidateQueries({ queryKey: ['tracking-pixels'] }),
  });

  function resetForm() {
    setForm({ ...DEFAULT_FORM });
    setEditId(null);
    setShowForm(false);
  }

  function openEdit(px: TrackingPixel) {
    setForm({
      provider: px.provider,
      name    : px.name,
      pixelId : px.pixelId,
      isActive: px.isActive,
      events  : px.events,
    });
    setEditId(px.id);
    setShowForm(true);
  }

  function toggleEvent(ev: EventName) {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev)
        ? f.events.filter(e => e !== ev)
        : [...f.events, ev],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())   { toast.error('Nome obrigatório'); return; }
    if (!form.pixelId.trim()) { toast.error('ID do pixel obrigatório'); return; }
    if (form.events.length === 0) { toast.error('Selecione ao menos um evento'); return; }

    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const providerLabel = (v: Provider) => PROVIDERS.find(p => p.value === v)?.label ?? v;
  const isPending     = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Activity size={20} className="text-accent" strokeWidth={1.5} />
            Pixels de Rastreamento
          </h1>
          <p className="text-sm text-text3 mt-0.5">
            Configure pixels de conversão para monitorar seus checkouts.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Plus size={15} /> Adicionar pixel
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg2 border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {editId ? 'Editar pixel' : 'Novo pixel'}
            </h2>
            <button onClick={resetForm} className="text-text3 hover:text-text2">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider */}
            <div>
              <label className="block text-xs font-medium text-text2 mb-2 uppercase tracking-wide">
                Plataforma
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {PROVIDERS.map(p => {
                  const active = form.provider === p.value;
                  return (
                    <label
                      key={p.value}
                      className={`cursor-pointer rounded-xl border px-3 py-3 flex flex-col items-center gap-2 transition-all ${
                        active ? 'border-[2px]' : 'border-border hover:border-border/60'
                      }`}
                      style={active ? { borderColor: p.color, background: `${p.color}10` } : {}}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={p.value}
                        checked={active}
                        onChange={() => setForm(f => ({ ...f, provider: p.value }))}
                        className="sr-only"
                      />
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${p.color}20`, color: p.color }}
                      >
                        <ProviderIcon provider={p.value} size={20} />
                      </span>
                      <span
                        className={`text-[11px] font-medium text-center leading-tight ${active ? '' : 'text-text'}`}
                        style={active ? { color: p.color } : undefined}
                      >
                        {p.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Name + Pixel ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text2 mb-1.5 uppercase tracking-wide">
                  Nome do pixel
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input w-full"
                  placeholder={`Ex: ${providerLabel(form.provider)} Principal`}
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text2 mb-1.5 uppercase tracking-wide">
                  ID do pixel
                </label>
                <input
                  value={form.pixelId}
                  onChange={e => setForm(f => ({ ...f, pixelId: e.target.value.trim() }))}
                  className="input w-full font-mono"
                  placeholder="Ex: 123456789012345"
                  maxLength={200}
                  required
                />
              </div>
            </div>

            {/* Events */}
            <div>
              <label className="block text-xs font-medium text-text2 mb-2 uppercase tracking-wide">
                Eventos a disparar
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVENTS.map(ev => {
                  const active = form.events.includes(ev.value);
                  return (
                    <label
                      key={ev.value}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 flex items-start gap-2.5 transition-all ${
                        active
                          ? 'border-accent bg-accent/8'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleEvent(ev.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        active ? 'bg-accent border-accent' : 'border-border'
                      }`}>
                        {active && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${active ? 'text-accent' : 'text-text2'}`}>
                          {ev.label}
                        </p>
                        <p className="text-[10px] text-text3">{ev.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between bg-bg3 rounded-xl px-4 py-3 border border-border">
              <div>
                <p className="text-sm font-medium text-text">Pixel ativo</p>
                <p className="text-xs text-text3">Pixel inativo não é disparado no checkout</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`transition-colors ${form.isActive ? 'text-accent' : 'text-text3'}`}
              >
                {form.isActive
                  ? <ToggleRight size={28} strokeWidth={1.5} />
                  : <ToggleLeft  size={28} strokeWidth={1.5} />
                }
              </button>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isPending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  : <><Check size={14} /> {editId ? 'Salvar alterações' : 'Criar pixel'}</>
                }
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary px-5">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loading /></div>
      ) : pixels.length === 0 ? (
        <div className="bg-bg2 border border-border rounded-2xl p-10 text-center">
          <Activity size={32} className="text-text3 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm font-medium text-text2">Nenhum pixel configurado</p>
          <p className="text-xs text-text3 mt-1">Adicione pixels para rastrear eventos nos seus checkouts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pixels.map(px => (
            <div key={px.id} className="bg-bg2 border border-border rounded-2xl px-5 py-4 flex items-center gap-4">
              {/* Logo da plataforma */}
              {(() => {
                const p = PROVIDERS.find(pr => pr.value === px.provider);
                return (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${p?.color}18`, color: p?.color }}>
                    <ProviderIcon provider={px.provider} size={22} />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text truncate">{px.name}</span>
                  <ProviderBadge provider={px.provider} />
                  {!px.isActive && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red/10 text-red border border-red/20">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-text3 truncate">{px.pixelId}</p>
                <div className="flex gap-1 flex-wrap">
                  {px.events.map(ev => (
                    <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded bg-bg3 border border-border text-text3">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: px.id, isActive: !px.isActive })}
                  className={`p-1.5 rounded-lg transition-colors ${px.isActive ? 'text-accent hover:bg-accent/10' : 'text-text3 hover:bg-bg3'}`}
                  title={px.isActive ? 'Desativar' : 'Ativar'}
                >
                  {px.isActive
                    ? <ToggleRight size={18} strokeWidth={1.5} />
                    : <ToggleLeft  size={18} strokeWidth={1.5} />
                  }
                </button>
                <button
                  onClick={() => openEdit(px)}
                  className="p-1.5 rounded-lg text-text3 hover:text-accent hover:bg-accent/10 transition-colors"
                  title="Editar"
                >
                  <Pencil size={15} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Remover pixel "${px.name}"?`)) deleteMutation.mutate(px.id);
                  }}
                  className="p-1.5 rounded-lg text-text3 hover:text-red hover:bg-red/10 transition-colors"
                  title="Remover"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
