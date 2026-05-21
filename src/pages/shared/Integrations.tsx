import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Trash2, Save, Plug, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import melhorEnvioLogo from '@/assets/melhorenvio.png';
import nfeLogo from '@/assets/nfe.png';
import utmifyLogo from '@/assets/utmify.png';
import blingLogo from '@/assets/bling.png';

// ══════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════

type Provider = 'MELHOR_ENVIO' | 'NFE_IO' | 'BLING';

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
  logo       : string;
  color      : string;
  site       : string;
  oauth?     : boolean;        // se true, renderiza botão "Conectar" em vez de form
  oauthPath? : string;         // caminho relativo no backend (ex: /integrations/melhor-envio/authorize)
  comingSoon?: boolean;        // se true, card mostra overlay "Em breve" e desabilita ações
  comingSoonReason?: string;   // mensagem secundária explicando o motivo
  fields     : Array<{ key: string; label: string; type: 'text' | 'password' | 'checkbox'; placeholder?: string; hint?: string; required?: boolean }>;
}> = {
  MELHOR_ENVIO: {
    name       : 'Melhor Envio',
    description: 'Cotação, emissão de etiquetas e rastreamento de envios. Conecte sua conta via OAuth.',
    logo       : melhorEnvioLogo,
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
    logo       : nfeLogo,
    color      : '#0055FE',
    site       : 'https://nfe.io',
    fields     : [
      { key: 'apiKey',          label: 'API Key',             type: 'password', placeholder: 'Sua API key', required: true },
      { key: 'companyId',       label: 'Company ID',          type: 'text',     placeholder: 'ID da empresa cadastrada', required: true },
      { key: 'cityServiceCode', label: 'Código de serviço municipal', type: 'text', placeholder: '01.07', hint: 'Código fiscal da sua prefeitura. Padrão: 01.07 (desenvolvimento/software).' },
    ],
  },
  BLING: {
    name       : 'Bling',
    description: 'ERP completo: pedidos, contas a receber, baixa automática e emissão de NF-e. Quando conectado, o Bling assume tudo (substitui o NFe.io).',
    logo       : blingLogo,
    color      : '#0066FF',
    site       : 'https://bling.com.br',
    oauth      : true,
    oauthPath  : '/integrations/bling/authorize',
    // Sem fields manuais — fluxo é 100% OAuth: clica "Conectar Bling" → autoriza no painel
    // do Bling → callback salva os tokens e volta com a integração ativa. Igual Melhor Envio.
    fields     : [],
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

  // Callback do OAuth (Melhor Envio + Bling) — mostra toast e limpa query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const me = params.get('me');
    const bling = params.get('bling');
    if (me === 'ok') {
      toast.success('Melhor Envio conectado!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (me === 'error') {
      toast.error(`Falha ao conectar Melhor Envio: ${params.get('reason') || 'erro desconhecido'}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (bling === 'ok') {
      toast.success('Bling conectado!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (bling === 'error') {
      toast.error(`Falha ao conectar Bling: ${params.get('reason') || 'erro desconhecido'}`);
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
          {(['NFE_IO', 'MELHOR_ENVIO', 'BLING'] as Provider[]).map(p => {
            if (PROVIDER_META[p].comingSoon) {
              return <ComingSoonCard key={p} provider={p} />;
            }
            const row = data?.data.find(d => d.provider === p);
            return (
              <IntegrationCard
                key={p}
                provider={p}
                row={row ?? { provider: p, configured: false, isActive: false, config: null, updatedAt: null }}
              />
            );
          })}
          <UtmifyCard />
        </div>
      )}

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

function ComingSoonCard({ provider }: { provider: Provider }) {
  const meta = PROVIDER_META[provider];
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber/15 text-amber border border-amber/30 uppercase tracking-wide">
        Em breve
      </div>

      <div className="flex items-start gap-3 opacity-60">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden grayscale ${meta.name === 'Bling' ? 'bg-bg3' : 'bg-white'}`}>
          <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain p-1.5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text">{meta.name}</h3>
          <p className="text-xs text-text3 mt-0.5 leading-relaxed">{meta.description}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-start gap-2">
        <div className="w-1 self-stretch rounded-full bg-amber/50 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-medium text-text2">Integração temporariamente indisponível</p>
          {meta.comingSoonReason && (
            <p className="text-[11px] text-text3 mt-0.5 leading-relaxed">{meta.comingSoonReason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ provider, row }: { provider: Provider; row: IntegrationRow }) {
  const qc   = useQueryClient();
  const meta = PROVIDER_META[provider];

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
      const hasToken = !!(row.config as any)?.accessToken;
      if (meta.oauth && !hasToken) {
        toast.success('Credenciais salvas. Agora clique em Conectar pra autorizar.');
      } else {
        toast.success('Integração salva!');
      }
      qc.invalidateQueries({ queryKey: ['user-integrations'] });
      // Mantém editando pra OAuth sem token (pra mostrar botão Conectar)
      if (!meta.oauth || hasToken) setEditing(false);
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
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${meta.name === 'Bling' ? 'bg-bg3' : 'bg-white'}`}>
            <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain p-1.5" />
          </div>
          <div>
            <h3 className="font-semibold text-text flex items-center gap-2 flex-wrap">
              {meta.name}
              {meta.name === 'Bling' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 border border-yellow-500/40">
                  Versão beta de teste
                </span>
              )}
              {row.configured && row.isActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green/15 text-green border border-green/30">
                  <CheckCircle2 size={10} /> Ativo
                </span>
              )}
            </h3>
            <p className="text-xs text-text3 mt-0.5">{meta.description}</p>
            <div className="flex items-center gap-3 mt-1">
              <a href={meta.site} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline inline-block">
                {meta.site.replace(/^https?:\/\//, '')} →
              </a>
              <Link
                to={`../ajuda#help-${provider === 'NFE_IO' ? 'nfe' : provider === 'MELHOR_ENVIO' ? 'me' : provider.toLowerCase()}`}
                className="text-[11px] text-text3 hover:text-accent hover:underline inline-flex items-center gap-1"
              >
                <HelpCircle size={11} />
                Veja como integrar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* OAuth-only sem campos: botão "Conectar" direto (Melhor Envio sem creds próprias) */}
      {meta.oauth && !row.configured && editing && meta.fields.length === 0 ? (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-text3">
            Você vai ser redirecionado para autorizar o Kairos. Depois de autorizar, volta pra cá com a conexão pronta.
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
      ) : /* Form tradicional ou OAuth com credenciais por produtor (Bling) */
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

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Save size={13} />
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </button>

            {/* OAuth para providers com credenciais salvas mas ainda sem token */}
            {meta.oauth && row.configured && !row.config?.accessToken && (
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
                className="btn-sm inline-flex items-center gap-1.5 text-white"
                style={{ background: meta.color, borderColor: meta.color }}
              >
                <Plug size={13} />
                Conectar {meta.name}
              </button>
            )}

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
            {meta.oauth && meta.fields.length === 0 ? (
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
                className="btn-sec btn-sm flex items-center gap-1.5"
              >
                <Plug size={13} />
                Reconectar
              </button>
            ) : (
              <button
                onClick={() => { setEditing(true); setValues({}); }}
                className="btn-sec btn-sm"
              >
                Editar
              </button>
            )}
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

// ══════════════════════════════════════════════════════════════════
// UTMIFY CARD (token simples — não passa por /integrations genérico)
// ══════════════════════════════════════════════════════════════════

function UtmifyCard() {
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);

  const { data: status, isLoading } = useQuery<{ enabled: boolean; tokenMask: string | null }>({
    queryKey: ['utmify-status'],
    queryFn : () => api.get('/producers/utmify').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: (t: string | null) => api.patch('/producers/utmify', { utmifyApiToken: t }),
    onSuccess : (res: any) => {
      toast.success(res?.data?.message || 'Salvo');
      setToken('');
      qc.invalidateQueries({ queryKey: ['utmify-status'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const isConfigured = !!status?.enabled;

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={utmifyLogo} alt="Utmify" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-semibold text-text flex items-center gap-2">
              Utmify
              {!isLoading && isConfigured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green/15 text-green border border-green/30">
                  <CheckCircle2 size={10} /> Ativo
                </span>
              )}
            </h3>
            <p className="text-xs text-text3 mt-0.5">
              Rastreamento avançado de campanhas e atribuição de vendas. Captura UTMs automaticamente no checkout.
            </p>
            <a href="https://app.utmify.com.br" target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline mt-1 inline-block">
              app.utmify.com.br →
            </a>
          </div>
        </div>
      </div>

      {isConfigured && status?.tokenMask && (
        <div className="text-xs text-text3 bg-bg3 rounded-md px-3 py-2 font-mono">
          Token atual: <strong className="text-text2">{status.tokenMask}</strong>
        </div>
      )}

      <div className="form-group">
        <label className="label">{isConfigured ? 'Substituir token' : 'API Token Utmify *'}</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={token}
            onChange={e => setToken(e.target.value)}
            className="input pr-10"
            placeholder="cole o token de Integrações > Webhooks > Credenciais API"
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-text3 mt-1">
          Crie a credencial em <em>app.utmify.com.br → Integrações → Webhooks → "Adicionar Credencial"</em> e cole o token aqui.
          Cada venda (criada/aprovada/cancelada) é reportada para a Utmify automaticamente.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        {isConfigured && (
          <button
            onClick={() => { if (window.confirm('Desativar a integração Utmify? Seu token será removido.')) save.mutate(null); }}
            disabled={save.isPending}
            className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10"
          >
            <Trash2 size={13} /> Desativar
          </button>
        )}
        <button
          onClick={() => save.mutate(token)}
          disabled={token.length < 8 || save.isPending}
          className="btn-primary btn-sm"
        >
          <Save size={13} /> Salvar token
        </button>
      </div>
    </div>
  );
}
