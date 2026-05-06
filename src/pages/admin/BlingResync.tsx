import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Loading } from '@/components/ui';
import { RefreshCw, Save, Play, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import blingLogo from '@/assets/bling.png';

type Config = {
  enabled        : boolean;
  intervalMinutes: number;
  lookbackDays   : number;
  lastRunAt     ?: string | null;
};
type HistoryEntry = {
  at              : string;
  source          : 'auto' | 'manual';
  enqueued        : number;
  skipped         : number;
  producersChecked: number;
  lookbackDays    : number;
};
type ResyncResp = { config: Config; history: HistoryEntry[] };

const INTERVAL_OPTIONS = [
  { v: 30,    label: '30 minutos' },
  { v: 60,    label: '1 hora' },
  { v: 180,   label: '3 horas' },
  { v: 360,   label: '6 horas' },
  { v: 720,   label: '12 horas' },
  { v: 1440,  label: '24 horas (1 dia)' },
  { v: 4320,  label: '3 dias' },
  { v: 10080, label: '7 dias' },
];

export default function AdminBlingResync() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config>({ enabled: false, intervalMinutes: 360, lookbackDays: 30 });

  const { data, isLoading } = useQuery<ResyncResp>({
    queryKey: ['admin-bling-resync'],
    queryFn : () => api.get('/admin/bling/resync').then(r => r.data),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data?.config) setForm({
      enabled        : !!data.config.enabled,
      intervalMinutes: data.config.intervalMinutes ?? 360,
      lookbackDays   : data.config.lookbackDays ?? 30,
    });
  }, [data?.config]);

  const save = useMutation({
    mutationFn: () => api.put('/admin/bling/resync/config', {
      enabled        : form.enabled,
      intervalMinutes: Number(form.intervalMinutes),
      lookbackDays   : Number(form.lookbackDays),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Configuração salva!');
      qc.invalidateQueries({ queryKey: ['admin-bling-resync'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const runNow = useMutation({
    mutationFn: () => api.post('/admin/bling/resync/run', { lookbackDays: form.lookbackDays }).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Resync disparado! ${data.enqueued} pedidos enfileirados, ${data.skipped} pulados (já sincronizados).`);
      qc.invalidateQueries({ queryKey: ['admin-bling-resync'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao executar'),
  });

  const lastRun = data?.config?.lastRunAt ? new Date(data.config.lastRunAt) : null;
  const nextRunDate = (form.enabled && lastRun)
    ? new Date(lastRun.getTime() + form.intervalMinutes * 60_000)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resync Bling"
        sub="Reprocessa vendas APPROVED dos últimos N dias e sincroniza com o Bling de cada produtor que tem a integração ativa."
      />

      {isLoading ? <Loading /> : (
        <>
          <div className="card">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center overflow-hidden">
                <img src={blingLogo} alt="Bling" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Configuração</h3>
                <p className="text-xs text-text3">
                  Quando ativo, o sistema verifica a cada minuto e roda automaticamente quando o intervalo bate.
                </p>
              </div>
            </div>

            {/* Toggle automático */}
            <div className="flex items-center gap-3 mb-4">
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm(f => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 accent-accent"
              />
              <label htmlFor="enabled" className="text-sm font-semibold text-text cursor-pointer">
                Resync automático ativo
              </label>
              {form.enabled && (
                <span className="badge-green">
                  <CheckCircle2 size={10} /> ON
                </span>
              )}
              {!form.enabled && (
                <span className="badge-gray">OFF — apenas manual</span>
              )}
            </div>

            {/* Configs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text2">Intervalo de execução</label>
                <select
                  className="input mt-1 w-full"
                  value={form.intervalMinutes}
                  onChange={(e) => setForm(f => ({ ...f, intervalMinutes: Number(e.target.value) }))}
                  disabled={!form.enabled}
                >
                  {INTERVAL_OPTIONS.map(o => (
                    <option key={o.v} value={o.v}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-text3 mt-1">Frequência com que o resync automático roda. Sem efeito se "automático" estiver OFF.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text2">Lookback (dias)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  className="input mt-1 w-full"
                  value={form.lookbackDays}
                  onChange={(e) => setForm(f => ({ ...f, lookbackDays: Number(e.target.value) || 30 }))}
                />
                <p className="text-[11px] text-text3 mt-1">Reprocessa Orders APPROVED dos últimos N dias. Pedidos já sincronizados (com <code>blingPedidoId</code>) são pulados.</p>
              </div>
            </div>

            {/* Status atual */}
            {form.enabled && (
              <div className="mt-4 p-3 rounded-lg border border-border bg-bg3/40 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-text3" />
                  <span className="text-text2">Última execução:</span>
                  <span className="text-text">{lastRun ? lastRun.toLocaleString('pt-BR') : 'nunca executou'}</span>
                </div>
                {nextRunDate && (
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-text3" />
                    <span className="text-text2">Próxima execução:</span>
                    <span className="text-text">{nextRunDate.toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="btn-primary btn-sm"
              >
                <Save size={14} /> {save.isPending ? 'Salvando...' : 'Salvar configuração'}
              </button>
              <button
                onClick={() => runNow.mutate()}
                disabled={runNow.isPending}
                className="btn-success btn-sm"
              >
                <Play size={14} /> {runNow.isPending ? 'Rodando...' : 'Rodar agora (manual)'}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Últimas execuções (50 mais recentes)</h3>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ['admin-bling-resync'] })}
                className="btn-ghost btn-sm"
                title="Atualizar"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {(!data?.history || data.history.length === 0) ? (
              <div className="flex items-center gap-2 text-sm text-text3 p-4 bg-bg3/30 rounded-lg">
                <AlertCircle size={14} /> Nenhuma execução registrada ainda.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Origem</th>
                      <th>Lookback</th>
                      <th>Producers</th>
                      <th>Enfileirados</th>
                      <th>Pulados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((h, i) => (
                      <tr key={i}>
                        <td className="text-text2">{new Date(h.at).toLocaleString('pt-BR')}</td>
                        <td>
                          <span className={h.source === 'auto' ? 'badge-blue' : 'badge-purple'}>
                            {h.source === 'auto' ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td className="text-text2">{h.lookbackDays} dias</td>
                        <td className="text-text2">{h.producersChecked}</td>
                        <td className="text-green font-medium">{h.enqueued}</td>
                        <td className="text-text3">{h.skipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Como funciona */}
          <div className="card text-sm space-y-2">
            <h3 className="font-semibold text-text">Como funciona</h3>
            <ul className="list-disc ml-5 space-y-1 text-text2">
              <li>Lista todos os <strong>producers que tem Bling conectado</strong> (UserIntegration BLING ativa).</li>
              <li>Pra cada um, busca <strong>Orders APPROVED dos últimos N dias</strong> (até 500 por execução).</li>
              <li>Pula os que já estão sincronizados (campo <code>blingPedidoId</code> em <code>Order.metadata</code>).</li>
              <li>Enfileira os restantes na fila <code>blingQueue</code> (worker processa com rate-limit 3 req/seg).</li>
              <li>Cada job tem retry exponencial (4 tentativas em até 7 min).</li>
              <li>Útil pra: Bling estava fora ar quando aprovou venda, integração foi conectada depois das vendas, app Bling em revisão recém aprovado.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
