import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Loading, TabNav } from '@/components/ui';
import { CheckCircle2, AlertCircle, Save, Send, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

type Profile = 'producer' | 'affiliate';

type ProfileConfig = {
  enabled       : boolean;
  baseUrl       : string;
  email         : string;
  hasPassword   : boolean;
  channelId     : string | null;
  webhookSecret : string | null;
  flowSecret    : string | null;
} | null;

type ConfigResponse = { producer: ProfileConfig; affiliate: ProfileConfig };

type Form = {
  enabled       : boolean;
  baseUrl       : string;
  email         : string;
  password      : string;
  channelId     : string;
  webhookSecret : string;
  flowSecret    : string;
};

const EMPTY: Form = {
  enabled       : false,
  baseUrl       : 'https://api.vaicrm.com.br',
  email         : '',
  password      : '',
  channelId     : '',
  webhookSecret : '',
  flowSecret    : '',
};

function loadFromConfig(c: ProfileConfig): Form {
  if (!c) return { ...EMPTY };
  return {
    enabled       : !!c.enabled,
    baseUrl       : c.baseUrl || EMPTY.baseUrl,
    email         : c.email || '',
    password      : '',                                  // nunca volta do backend
    channelId     : c.channelId || '',
    webhookSecret : '',                                  // só sobrescreve se digitar novo
    flowSecret    : '',
  };
}

export default function AdminVai() {
  const qc = useQueryClient();
  const { theme } = useTheme();
  const [tab, setTab] = useState<Profile>('producer');
  const [form, setForm] = useState<Form>(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('Teste de integração VAI · Kairos Way 🚀');

  const { data: config, isLoading } = useQuery<ConfigResponse>({
    queryKey: ['admin-vai-config'],
    queryFn : () => api.get('/admin/vai/config').then(r => r.data),
  });

  // Reset do form ao trocar de aba ou ao receber config nova do backend
  useEffect(() => {
    if (!config) return;
    setForm(loadFromConfig(config[tab]));
  }, [config, tab]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        enabled  : form.enabled,
        baseUrl  : 'https://api.vaicrm.com.br',          // fixo (UI não permite alterar)
        email    : form.email,
        channelId: form.channelId || null,
      };
      if (form.password)      payload.password      = form.password;
      if (form.webhookSecret) payload.webhookSecret = form.webhookSecret;
      if (form.flowSecret)    payload.flowSecret    = form.flowSecret;
      return api.put(`/admin/vai/config/${tab}`, payload);
    },
    onSuccess: () => {
      toast.success('Configuração salva!');
      setForm(f => ({ ...f, password: '', webhookSecret: '', flowSecret: '' }));
      qc.invalidateQueries({ queryKey: ['admin-vai-config'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const test = useMutation({
    mutationFn: () => api.post(`/admin/vai/test/${tab}`),
    onSuccess: (res) => toast.success(`Conexão OK · canal ${res.data.channelId.slice(-8)}`),
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Falha na conexão'),
  });

  const sendTest = useMutation({
    mutationFn: () =>
      api.post(`/admin/vai/test-message/${tab}`, { phone: testPhone, text: testText, name: 'Teste Kairos' }),
    onSuccess: () => toast.success('Mensagem de teste enviada!'),
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao enviar'),
  });

  const currentConfig: ProfileConfig = config ? config[tab] : null;
  const isConfigured = !!currentConfig?.email && currentConfig?.hasPassword;

  return (
    <div>
      <div className="flex flex-col items-center text-center gap-3 mb-6 py-6 border-b border-border">
        <img
          src={theme === 'light' ? '/assets/vaiLaranja.png' : '/assets/vaiBranco.png'}
          alt="VAI"
          className="h-24 w-auto object-contain"
        />
        <p className="text-sm text-text2 max-w-xl">
          Configure os números WhatsApp do seu CRM VAI por audiência. <strong className="text-text">PRODUTOR</strong> atende
          clientes finais e produtores; <strong className="text-text">AFILIADO</strong> fala com afiliados.
        </p>
      </div>

      <TabNav
        tabs={[
          { id: 'producer',  label: 'Produtor / Cliente', badge: config?.producer?.enabled  ? 'on'  : undefined },
          { id: 'affiliate', label: 'Afiliado',           badge: config?.affiliate?.enabled ? 'on'  : undefined },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Profile)}
      />

      {isLoading ? <Loading /> : (
        <div className="card mt-4 space-y-5">

          {/* Status atual */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            isConfigured && currentConfig?.enabled ? 'border-green/30 bg-green/5' :
            isConfigured                          ? 'border-amber/30 bg-amber/5' :
                                                    'border-border bg-bg3'
          }`}>
            {isConfigured && currentConfig?.enabled ? <CheckCircle2 className="text-green" size={18} /> :
             isConfigured                          ? <AlertCircle  className="text-amber" size={18} /> :
                                                     <AlertCircle  className="text-text3" size={18} />}
            <div className="text-sm">
              {!isConfigured && <span className="text-text2">Sem credenciais — preencha email e senha para ativar.</span>}
              {isConfigured && !currentConfig?.enabled && <span className="text-amber">Credenciais salvas mas integração desativada.</span>}
              {isConfigured && currentConfig?.enabled && (
                <span className="text-green">
                  Ativo · {currentConfig?.email}
                  {currentConfig?.channelId ? ` · canal ${currentConfig.channelId.slice(-8)}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex items-center gap-3">
              <input
                id="vai-enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 accent-accent"
              />
              <label htmlFor="vai-enabled" className="text-sm font-semibold text-text cursor-pointer">Integração ativa</label>
              <span className="text-xs text-text3">— quando off, nenhum disparo é feito por este canal.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-text2 flex items-center justify-between">
                Base URL
                <span className="text-text3 text-[10px] font-normal">fixo · padrão VAI</span>
              </label>
              <input
                className="input mt-1 w-full opacity-60 cursor-not-allowed"
                name={`vai-base-url-${tab}`}
                autoComplete="off"
                value="https://api.vaicrm.com.br"
                readOnly
                disabled
                aria-readonly
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text2">Channel ID (opcional)</label>
              <input
                className="input mt-1 w-full"
                name={`vai-channel-${tab}`}
                autoComplete="off"
                value={form.channelId}
                onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}
                placeholder="cha_… (deixe vazio pra autodescobrir)"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text2">Email (login VAI)</label>
              <input
                type="text"
                inputMode="email"
                className="input mt-1 w-full"
                name={`vai-email-${tab}`}
                autoComplete="off"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="conta@vaicrm.com.br"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text2 flex items-center justify-between">
                Senha
                <span className="text-text3 text-[10px] font-normal">
                  {currentConfig?.hasPassword && !form.password ? '(salva no servidor — preencha pra trocar)' : ''}
                </span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10 w-full"
                  name={`vai-password-${tab}`}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={currentConfig?.hasPassword ? '••••••••' : 'senha'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 hover:text-text"
                  aria-label="Mostrar senha"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text2">Webhook Secret (HMAC)</label>
              <input
                className="input mt-1 w-full"
                name={`vai-webhook-${tab}`}
                autoComplete="off"
                value={form.webhookSecret}
                onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
                placeholder={currentConfig?.webhookSecret ? `••••${currentConfig.webhookSecret.slice(-4) || ''}` : 'secret p/ x-vai-signature'}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text2">Flow Secret</label>
              <input
                className="input mt-1 w-full"
                name={`vai-flow-${tab}`}
                autoComplete="off"
                value={form.flowSecret}
                onChange={e => setForm(f => ({ ...f, flowSecret: e.target.value }))}
                placeholder={currentConfig?.flowSecret ? `••••${currentConfig.flowSecret.slice(-4) || ''}` : 'secret p/ x-flow-secret (opcional)'}
              />
            </div>
          </div>

          {/* Ações primárias */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="btn-primary btn-sm"
            >
              <Save size={14} /> {save.isPending ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              onClick={() => test.mutate()}
              disabled={test.isPending || !isConfigured}
              className="btn-ghost btn-sm"
              title={!isConfigured ? 'Configure email e senha antes' : 'Faz login + lista canal WhatsApp'}
            >
              <RefreshCw size={14} className={test.isPending ? 'animate-spin' : ''} />
              Testar conexão
            </button>
          </div>

          {/* Mensagem de teste */}
          <div className="border border-border rounded-[7px] p-3 space-y-3 bg-bg3/40">
            <div className="text-xs font-semibold text-text2 flex items-center gap-2">
              <Send size={13} /> Mensagem de teste
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="input w-full"
                name={`vai-test-phone-${tab}`}
                autoComplete="off"
                inputMode="tel"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="Telefone destino: (DD) 9XXXX-XXXX"
              />
              <input
                className="input w-full"
                name={`vai-test-text-${tab}`}
                autoComplete="off"
                value={testText}
                onChange={e => setTestText(e.target.value)}
                placeholder="Texto"
              />
            </div>
            <div>
              <button
                onClick={() => sendTest.mutate()}
                disabled={sendTest.isPending || !isConfigured || !testPhone}
                className="btn-success btn-sm"
                title={!isConfigured ? 'Configure email e senha antes' : 'Envia mensagem real via WhatsApp'}
              >
                <Send size={14} /> {sendTest.isPending ? 'Enviando…' : 'Enviar mensagem'}
              </button>
              <span className="text-[11px] text-text3 ml-3">Cobra contato real na VAI · use em testes pontuais.</span>
            </div>
          </div>

          {/* Eventos cobertos */}
          <details className="text-xs text-text2">
            <summary className="cursor-pointer font-semibold py-1">
              Eventos cobertos por este canal {tab === 'producer' ? '(Produtor / Cliente)' : '(Afiliado)'}
            </summary>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 leading-relaxed">
              {tab === 'producer' ? (
                <>
                  <div>• Pagamento pendente / aprovado / recusado</div>
                  <div>• Lembrete de pagamento</div>
                  <div>• Acesso liberado · primeiro acesso</div>
                  <div>• Não acessou após 24h · inatividade 3-7d</div>
                  <div>• Assinatura criada · renovação · falha · cancelamento</div>
                  <div>• Reembolso (recebido / aprovado / negado)</div>
                  <div>• Segurança (senha · email · login suspeito)</div>
                  <div>• Nova venda ao produtor (aprovada / pendente / recusada / reembolsada)</div>
                  <div>• Saque solicitado / aprovado / pago / recusado (produtor)</div>
                  <div>• Resumo diário · semanal · alertas</div>
                </>
              ) : (
                <>
                  <div>• Conta criada / aprovada / rejeitada</div>
                  <div>• Pedido de afiliação enviado / aprovado / rejeitado pelo produtor</div>
                  <div>• Comissão gerada / pendente / aprovada / cancelada</div>
                  <div>• Saque solicitado / aprovado / pago / recusado (afiliado)</div>
                  <div>• Saldo disponível</div>
                  <div>• Resumo de ganhos · novos produtos disponíveis</div>
                </>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
