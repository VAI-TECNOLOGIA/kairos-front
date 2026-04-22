import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Truck, FileText, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Trash2, Save, Plug } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════

type Provider = 'MELHOR_ENVIO' | 'NFE_IO';

interface IntegrationRow {
  provider  : Provider;
  configured: boolean;
  isActive  : boolean;
  config    : any | null;
  updatedAt : string | null;
}

const PROVIDER_META: Record<Provider, {
  name       : string;
  description: string;
  icon       : any;
  color      : string;
  site       : string;
  oauth?     : boolean;        // se true, renderiza botão "Conectar" em vez de form
  oauthPath? : string;         // caminho relativo no backend (ex: /integrations/melhor-envio/authorize)
  fields     : Array<{ key: string; label: string; type: 'text' | 'password' | 'checkbox'; placeholder?: string; hint?: string; required?: boolean }>;
}> = {
  MELHOR_ENVIO: {
    name       : 'Melhor Envio',
    description: 'Cotação, emissão de etiquetas e rastreamento de envios. Conecte sua conta via OAuth.',
    icon       : Truck,
    color      : '#00A881',
    site       : 'https://melhorenvio.com.br',
    oauth      : true,
    oauthPath  : '/integrations/melhor-envio/authorize',
    fields     : [
      { key: 'fromCep',   label: 'CEP de origem padrão', type: 'text', placeholder: '01310100', hint: 'Usado como origem padrão nas cotações.' },
      { key: 'userAgent', label: 'User-Agent',           type: 'text', placeholder: 'Kairos Way (contato@sua-loja.com.br)', hint: 'Recomendado pelo Melhor Envio para identificar sua aplicação.' },
    ],
  },
  NFE_IO: {
    name       : 'NFe.io',
    description: 'Emissão automática de nota fiscal após pagamento aprovado. Cadastre sua conta pessoal.',
    icon       : FileText,
    color      : '#0055FE',
    site       : 'https://nfe.io',
    fields     : [
      { key: 'apiKey',          label: 'API Key',             type: 'password', placeholder: 'Sua API key', required: true },
      { key: 'companyId',       label: 'Company ID',          type: 'text',     placeholder: 'ID da empresa cadastrada', required: true },
      { key: 'cityServiceCode', label: 'Código de serviço municipal', type: 'text', placeholder: '01.07', hint: 'Código fiscal da sua prefeitura. Padrão: 01.07 (desenvolvimento/software).' },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function IntegrationsPage() {
  const { data, isLoading } = useQuery<{ data: IntegrationRow[] }>({
    queryKey: ['user-integrations'],
    queryFn : () => api.get('/integrations').then(r => r.data),
  });

  // Callback do OAuth Melhor Envio — mostra toast e limpa query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const me = params.get('me');
    if (me === 'ok') {
      toast.success('Melhor Envio conectado!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (me === 'error') {
      toast.error(`Falha ao conectar Melhor Envio: ${params.get('reason') || 'erro desconhecido'}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        sub="Configure suas credenciais de API. Cada conta mantém suas próprias chaves."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-bg3 rounded-2xl animate-pulse" />
          <div className="h-64 bg-bg3 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(['NFE_IO', 'MELHOR_ENVIO'] as Provider[]).map(p => {
            const row = data?.data.find(d => d.provider === p);
            return (
              <IntegrationCard
                key={p}
                provider={p}
                row={row ?? { provider: p, configured: false, isActive: false, config: null, updatedAt: null }}
              />
            );
          })}
        </div>
      )}

      <div className="card bg-accent/5 border-accent/20">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 size={14} className="text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs text-text2 leading-relaxed">
            <strong className="text-text">Pagar.me já está configurado na plataforma.</strong>
            {' '}Os pagamentos são recebidos na conta da Kairos Way e repassados automaticamente para você.
            Você não precisa configurar Pagar.me.
          </div>
        </div>
      </div>

      <div className="card bg-bg3/50 border-dashed">
        <div className="flex items-center gap-2.5">
          <Plug size={14} className="text-text3" />
          <p className="text-xs text-text3">
            Suas credenciais são armazenadas com segurança e usadas apenas para chamadas de API em seu nome.
            Nunca compartilhamos seus tokens com terceiros.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CARD DE UMA INTEGRAÇÃO
// ══════════════════════════════════════════════════════════════════

function IntegrationCard({ provider, row }: { provider: Provider; row: IntegrationRow }) {
  const qc   = useQueryClient();
  const meta = PROVIDER_META[provider];
  const Icon = meta.icon;

  const [editing, setEditing] = useState(!row.configured);
  const [values, setValues]   = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult]   = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    // Quando começa a editar ou o row muda, reseta valores
    if (!editing && row.config) {
      // Em visualização (config mascarada do backend)
      setValues(row.config || {});
    } else if (editing) {
      // Em edição, começa vazio (não exibimos valores mascarados)
      setValues({});
    }
  }, [editing, row.config]);

  const save = useMutation({
    mutationFn: () => api.put(`/integrations/${provider}`, {
      config  : values,
      isActive: true,
    }),
    onSuccess: () => {
      toast.success('Integração salva!');
      qc.invalidateQueries({ queryKey: ['user-integrations'] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/integrations/${provider}`),
    onSuccess: () => {
      toast.success('Integração removida');
      qc.invalidateQueries({ queryKey: ['user-integrations'] });
      setEditing(true);
      setValues({});
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const test = useMutation({
    mutationFn: () => api.post(`/integrations/${provider}/test`).then(r => r.data),
    onSuccess: (data: any) => {
      setTestResult({ ok: !!data.ok, error: data.error });
      if (data.ok) toast.success('Conexão OK!');
      else toast.error(data.error || 'Falha na conexão');
    },
    onError: (e: any) => {
      setTestResult({ ok: false, error: e?.message });
      toast.error('Erro ao testar');
    },
  });

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}1f`, border: `1px solid ${meta.color}40` }}
          >
            <Icon size={20} style={{ color: meta.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-text flex items-center gap-2">
              {meta.name}
              {row.configured && row.isActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green/15 text-green border border-green/30">
                  <CheckCircle2 size={10} /> Ativo
                </span>
              )}
            </h3>
            <p className="text-xs text-text3 mt-0.5">{meta.description}</p>
            <a href={meta.site} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline mt-1 inline-block">
              {meta.site.replace(/^https?:\/\//, '')} →
            </a>
          </div>
        </div>
      </div>

      {/* OAuth: botão "Conectar" quando não configurado */}
      {meta.oauth && !row.configured && editing ? (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-text3">
            Você vai ser redirecionado para autorizar o Kairos no Melhor Envio.
            Depois de autorizar, volta pra cá com a conexão pronta.
          </p>
          <button
            onClick={async () => {
              try {
                const { data } = await api.get(meta.oauthPath!);
                if (data?.url) window.location.href = data.url;
                else toast.error('Não foi possível iniciar a conexão');
              } catch (e: any) {
                toast.error(e?.response?.data?.message || 'Erro ao iniciar OAuth');
              }
            }}
            className="btn-primary btn-sm inline-flex items-center gap-1.5"
            style={{ background: meta.color, borderColor: meta.color }}
          >
            <Plug size={13} />
            Conectar {meta.name}
          </button>
        </div>
      ) : /* Form tradicional ou campos adicionais para OAuth já conectado */
      editing ? (
        <div className="space-y-3 pt-2 border-t border-border">
          {meta.fields.map(f => {
            const show = showSecrets[f.key];
            if (f.type === 'checkbox') {
              return (
                <label key={f.key} className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!values[f.key]}
                    onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  {f.label}
                  {f.hint && <span className="text-[11px] text-text3">— {f.hint}</span>}
                </label>
              );
            }
            return (
              <div key={f.key}>
                <label className="label flex items-center gap-1">
                  {f.label}
                  {f.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={f.type === 'password' && !show ? 'password' : 'text'}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`input h-9 ${f.type === 'password' ? 'pr-10' : ''}`}
                  />
                  {f.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2"
                    >
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                {f.hint && <p className="text-[11px] text-text3 mt-1">{f.hint}</p>}
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Save size={13} />
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {row.configured && (
              <button
                onClick={() => { setEditing(false); setTestResult(null); }}
                className="btn-sec btn-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-border">
          {meta.fields.map(f => {
            if (f.type === 'checkbox') {
              const v = row.config?.[f.key];
              return (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="text-text3 w-32">{f.label}:</span>
                  <span className={v ? 'text-green' : 'text-text3'}>{v ? 'Sim' : 'Não'}</span>
                </div>
              );
            }
            return (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                <span className="text-text3 w-32">{f.label}:</span>
                <code className="text-text font-mono text-xs">{row.config?.[f.key] || '—'}</code>
              </div>
            );
          })}

          {testResult && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
              testResult.ok
                ? 'bg-green/10 text-green border-green/30'
                : 'bg-red/10 text-red-400 border-red/30'
            }`}>
              {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {testResult.ok ? 'Conexão estabelecida com sucesso' : (testResult.error || 'Falha na conexão')}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => { setTestResult(null); test.mutate(); }}
              disabled={test.isPending}
              className="btn-sec btn-sm flex items-center gap-1.5"
            >
              {test.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
              Testar conexão
            </button>
            <button
              onClick={() => { setEditing(true); setValues({}); }}
              className="btn-sec btn-sm"
            >
              Editar
            </button>
            <button
              onClick={() => {
                if (confirm('Remover credenciais desta integração?')) remove.mutate();
              }}
              className="btn-ghost btn-sm text-text3 hover:text-red-400 flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
