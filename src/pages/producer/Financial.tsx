import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, StatCard, Modal, KairosWithdrawCard } from '@/components/ui';
import { formatBRL, formatDateTime, bankLabel, withdrawalBankDisplay } from '@/lib/utils';
import { DollarSign, ArrowDownCircle, Eye, EyeOff, Trash2, AlertCircle, Building2, Zap } from 'lucide-react';

interface WithdrawForm {
  amountReais: string;
}

export default function MyFinancial() {
  const qc = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [showBal, setShowBal] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: balance } = useQuery({
    queryKey: ['my-balance'],
    queryFn : () => api.get('/financial/balance').then(r => r.data),
  });

  const { data: splits } = useQuery({
    queryKey: ['my-splits'],
    queryFn : () => api.get('/financial/splits?limit=20').then(r => r.data),
  });

  const { data: withdrawals, refetch: refetchWd } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn : () => api.get('/financial/withdrawals').then(r => r.data),
  });

  const { data: wdStatus } = useQuery<{ ready: boolean; readyAt: string | null; cooldownDays: number; isCustomCooldown: boolean }>({
    queryKey: ['withdraw-status'],
    queryFn : () => api.get('/financial/withdraw-status').then(r => r.data),
  });

  const available   = balance?.availableCents  || 0;
  const wdList: any[] = withdrawals?.data || [];

  // Verifica se tem saque PENDING
  const hasPending = wdList.some((w: any) => w.status === 'PENDING' || w.status === 'PROCESSING');
  const cooldownReady = wdStatus?.ready ?? true;

  const { data: producerMe } = useQuery({
    queryKey: ['producer-me-bank'],
    queryFn : () => api.get('/producers/me').then(r => r.data),
  });
  const bankData = (producerMe?.bankData as any) || null;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<WithdrawForm>({
    defaultValues: { amountReais: '' },
  });

  const amountReais    = watch('amountReais');
  const amountNum      = parseFloat((amountReais || '0').replace(',', '.')) || 0;
  const amountCents    = Math.round(amountNum * 100);

  // Preview da taxa de saque — busca breakdown (bruto, taxa, liquido) conforme o produtor digita
  const { data: preview } = useQuery<{ amountCents: number; feeCents: number; netCents: number; blocked: boolean }>({
    queryKey: ['withdraw-preview', amountCents],
    queryFn : () => api.get(`/financial/withdraw/preview?amountCents=${amountCents}`).then(r => r.data),
    enabled : amountCents > 0,
  });
  const feeCents = preview?.feeCents ?? 0;
  const netCents = preview?.netCents ?? amountCents;
  const feeBlocks = !!preview?.blocked;
  // const aboveMin    = amountCents >= 5000; // produção — voltar quando testes acabarem
  const aboveMin       = amountCents >= 100; // TEMP testes
  const aboveAvailable = amountCents <= available;
  const canSubmit      = aboveMin && aboveAvailable && !hasPending && cooldownReady && !!bankData && !feeBlocks;

  const withdraw = useMutation({
    mutationFn: (d: WithdrawForm) => api.post('/financial/withdraw', {
      amountCents: Math.round(parseFloat(d.amountReais.replace(',', '.')) * 100),
    }),
    onSuccess: () => {
      toast.success('Saque solicitado! Você receberá uma notificação quando for processado.');
      qc.invalidateQueries({ queryKey: ['my-balance'] });
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao solicitar saque'),
  });

  // Cancelar saque PENDING
  const cancelWithdraw = useMutation({
    mutationFn: (id: string) => api.delete(`/financial/withdrawals/${id}`),
    onSuccess: () => {
      toast.success('Pedido de saque cancelado.');
      qc.invalidateQueries({ queryKey: ['my-balance'] });
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
      setCancelId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao cancelar'),
  });

  // Marcar saque PROCESSING como recebido (caso a TED já tenha caído na conta mas Pagar.me não fechou)
  const markReceived = useMutation({
    mutationFn: (id: string) => api.post(`/financial/withdrawals/${id}/mark-received`),
    onSuccess: () => {
      toast.success('Recebimento confirmado!');
      qc.invalidateQueries({ queryKey: ['my-balance'] });
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao confirmar'),
  });

  const statusVariant = (s: string) => {
    if (s === 'PAID')       return 'badge-green';
    if (s === 'PROCESSING') return 'badge-blue';
    if (s === 'FAILED')     return 'badge-red';
    return 'badge-amber';
  };

  // Calcula quando o botão "Já recebi" libera (espelha a regra do backend):
  //   aprovação 8h-15h (BRT) → 1h; fora disso → 6h.
  // Aprovação = metadata.pagarmeWithdrawal.createdAt (set quando admin clica Processar),
  // fallback pra createdAt do withdrawal.
  const receivedReleaseInfo = (w: any) => {
    if (w.status !== 'PROCESSING') return { canMark: false, waitMin: 0 };
    const approvedIso = w.metadata?.pagarmeWithdrawal?.createdAt || w.createdAt;
    const approvedAt  = new Date(approvedIso);
    const brtHour     = (approvedAt.getUTCHours() - 3 + 24) % 24;
    const requiredHs  = (brtHour >= 8 && brtHour < 16) ? 1 : 6;
    const elapsedMs   = Date.now() - approvedAt.getTime();
    const requiredMs  = requiredHs * 60 * 60 * 1_000;
    const remainingMin = Math.max(0, Math.ceil((requiredMs - elapsedMs) / 60_000));
    return { canMark: elapsedMs >= requiredMs, waitMin: remainingMin };
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      PENDING: 'Pendente', PROCESSING: 'Processando', PAID: 'Pago', FAILED: 'Falhou',
    };
    return map[s] || s;
  };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        sub="Saldo, repasses e saques"
        actions={
          <button
            onClick={() => {
              if (!cooldownReady) {
                const dt = wdStatus?.readyAt ? new Date(wdStatus.readyAt).toLocaleDateString('pt-BR') : '';
                toast.error(`Saque liberado a partir de ${dt}.`);
                return;
              }
              if (hasPending) { toast.error('Você já tem um saque pendente. Aguarde o processamento.'); return; }
              // if (available < 5000) { toast.error('Saldo insuficiente. Mínimo para saque: R$ 50,00'); return; } // produção — voltar quando testes acabarem
              if (available < 100) { toast.error('Saldo insuficiente. Mínimo para saque: R$ 1,00'); return; } // TEMP testes
              if (!bankData) { toast.error('Cadastre seus dados bancários em "Verificação" antes de solicitar saque.'); return; }
              setOpen(true);
            }}
            // className={`btn-primary btn-sm ${(!cooldownReady || hasPending || available < 5000) ? 'opacity-60 cursor-not-allowed' : ''}`} // produção
            className={`btn-primary btn-sm ${(!cooldownReady || hasPending || available < 100) ? 'opacity-60 cursor-not-allowed' : ''}`} // TEMP testes
          >
            <ArrowDownCircle size={14} /> Solicitar saque
          </button>
        }
      />

      {/* Banner cooldown — bloqueio temporário */}
      {!cooldownReady && wdStatus?.readyAt && (
        <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-[10px] p-3 mb-4">
          <AlertCircle size={15} className="text-amber flex-shrink-0" />
          <div className="text-sm text-amber">
            <strong>Saque ainda não liberado.</strong>{' '}
            Período de carência de <strong>{wdStatus.cooldownDays} dia(s)</strong> após sua aprovação.
            Liberado a partir de <strong>{new Date(wdStatus.readyAt).toLocaleDateString('pt-BR')}</strong>.
          </div>
        </div>
      )}

      {/* Alerta saque pendente */}
      {hasPending && (
        <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-[10px] p-3 mb-4">
          <AlertCircle size={15} className="text-amber flex-shrink-0" />
          <span className="text-sm text-amber">
            Você tem um saque pendente de aprovação. Novos saques só poderão ser solicitados após a conclusão.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text3">Saldo disponível</span>
            <button onClick={() => setShowBal(!showBal)} className="text-text3 hover:text-text2">
              {showBal ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>
          <div className="text-2xl font-bold text-text">
            {showBal ? formatBRL(available) : '••••••'}
          </div>
          {/* produção — voltar quando testes acabarem:
          <div className={`text-[10px] mt-0.5 ${available >= 5000 ? 'text-green' : 'text-text3'}`}>
            {available >= 5000 ? 'Disponível para saque' : 'Mínimo R$ 50,00 para sacar'}
          </div>
          */}
          <div className={`text-[10px] mt-0.5 ${available >= 100 ? 'text-green' : 'text-text3'}`}>
            {available >= 100 ? 'Disponível para saque' : 'Mínimo R$ 1,00 para sacar'}
          </div>
        </div>
        <StatCard
          label="Em processamento"
          value={formatBRL((balance?.stuckInProcessing || 0) + (balance?.pendingCents || 0))}
          sub={(balance?.stuckInProcessing || 0) > 0 ? 'Aguardando liberação financeira' : 'splits dentro do prazo de carência'}
        />
        <KairosWithdrawCard
          value={formatBRL(balance?.withdrawnCents || 0)}
          sub="saques processados"
        />
      </div>

      {/* Antecipação automática — desabilitado temporariamente, voltar quando o fluxo Pagar.me estiver estável
      <AnticipationCard />
      */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Histórico de splits */}
        <div className="card">
          <div className="section-title mb-4">Histórico de repasses</div>
          <div className="space-y-2">
            {(splits?.data || []).length === 0 ? (
              <p className="text-sm text-text3 text-center py-4">Nenhum repasse ainda</p>
            ) : (splits?.data || []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <div className="text-xs font-mono text-text2">{s.orderId?.slice(-8).toUpperCase()}</div>
                  <div className="text-[10px] text-text3">{formatDateTime(s.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={statusVariant(s.status)}>{statusLabel(s.status)}</span>
                  <span className="text-sm font-bold text-green">{formatBRL(s.amountCents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meus saques */}
        <div className="card">
          <div className="section-title mb-4">Meus saques</div>
          {wdList.length === 0 ? (
            <p className="text-sm text-text3 text-center py-4">Nenhum saque solicitado</p>
          ) : (
            <div className="space-y-2">
              {wdList.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text">{formatBRL(w.amountCents)}</div>
                    <div className="text-[10px] text-text3">{withdrawalBankDisplay(w)} · {formatDateTime(w.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={statusVariant(w.status)}>{statusLabel(w.status)}</span>
                    {w.status === 'PENDING' && (
                      <button
                        onClick={() => setCancelId(w.id)}
                        className="text-text3 hover:text-red transition-colors"
                        title="Cancelar pedido"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {w.status === 'PROCESSING' && (() => {
                      const r = receivedReleaseInfo(w);
                      if (r.canMark) {
                        return (
                          <button
                            onClick={() => {
                              if (confirm('Confirmar que você já recebeu este valor na sua conta bancária? Use só se o dinheiro de fato caiu — não dá pra desfazer.')) {
                                markReceived.mutate(w.id);
                              }
                            }}
                            disabled={markReceived.isPending}
                            className="text-xs text-green hover:underline transition-colors"
                            title="Já recebi o pagamento"
                          >
                            Já recebi
                          </button>
                        );
                      }
                      const h = Math.floor(r.waitMin / 60);
                      const m = r.waitMin % 60;
                      const txt = h > 0 ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
                      return (
                        <span className="text-[10px] text-text3" title="Confirmação liberada após período de carência da TED">
                          libera em {txt}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal solicitar saque */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title="Solicitar Saque"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setOpen(false); reset(); }}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={handleSubmit(d => withdraw.mutate(d))}
              disabled={withdraw.isPending || !canSubmit}
            >
              {withdraw.isPending ? 'Solicitando...' : 'Solicitar saque'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Saldo disponível */}
          <div className="bg-bg3 rounded-[7px] p-3 flex items-center justify-between">
            <span className="text-sm text-text2">Disponível para saque</span>
            <span className="font-bold text-green">{formatBRL(available)}</span>
          </div>

          {/* Valor */}
          <div className="form-group">
            {/* <label className="label">Valor (mínimo R$ 50,00)</label> */} {/* produção — voltar quando testes acabarem */}
            <label className="label">Valor (mínimo R$ 1,00)</label> {/* TEMP testes */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-sm">R$</span>
              <input
                {...register('amountReais', {
                  required: 'Obrigatório',
                  validate: v => {
                    const n = parseFloat(v.replace(',', '.'));
                    // if (isNaN(n) || n < 50) return 'Valor mínimo para saque é R$ 50,00'; // produção — voltar quando testes acabarem
                    if (isNaN(n) || n < 1) return 'Valor mínimo para saque é R$ 1,00'; // TEMP testes
                    if (Math.round(n * 100) > available) return `Valor excede o saldo disponível (${formatBRL(available)})`;
                    return true;
                  }
                })}
                className={`input pl-9 ${errors.amountReais ? 'border-red focus:border-red' : amountNum > 0 && aboveMin && aboveAvailable ? 'border-green/50' : ''}`}
                placeholder="1,00"
                inputMode="decimal"
              />
            </div>
            {errors.amountReais ? (
              <span className="text-xs text-red flex items-center gap-1 mt-1">⚠ {errors.amountReais.message}</span>
            ) : null}
          </div>

          {/* Breakdown da taxa — bruto / taxa / liquido / debitado do saldo */}
          {amountNum > 0 && aboveMin && aboveAvailable && !errors.amountReais && (
            <div className={`rounded-[7px] p-3 border ${feeBlocks ? 'border-red/30 bg-red/5' : 'border-border bg-bg3/40'}`}>
              <div className="flex items-center justify-between text-xs text-text2">
                <span>Valor solicitado</span>
                <span className="font-medium text-text">{formatBRL(amountCents)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-text2 mt-1">
                <span>Taxa de saque (Kairos)</span>
                <span className="font-medium text-red">− {formatBRL(feeCents)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">Você recebe na conta</span>
                <span className={`font-bold ${feeBlocks ? 'text-red' : 'text-green'}`}>{formatBRL(netCents)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text3 mt-2">
                <span>Debitado do seu saldo</span>
                <span>{formatBRL(amountCents)}</span>
              </div>
              {feeBlocks && (
                <p className="text-[11px] text-red mt-2">⚠ A taxa excede o valor solicitado. Aumente o valor do saque.</p>
              )}
            </div>
          )}

          {/* Conta bancária cadastrada */}
          {bankData ? (
            <div className="flex items-start gap-3 p-3 rounded-[8px] border border-border bg-bg3">
              <Building2 size={15} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text">{bankData.holderName}</div>
                <div className="text-[11px] text-text3 mt-0.5">
                  {bankLabel(bankData.bank)} · Ag. {bankData.branchNumber} / Cc. {bankData.accountNumber}
                </div>
                <div className="text-[10px] text-text3 mt-0.5 capitalize">{bankData.type === 'checking' ? 'Conta corrente' : 'Conta poupança'}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-[8px] bg-amber/8 border border-amber/20">
              <AlertCircle size={14} className="text-amber flex-shrink-0" />
              <p className="text-xs text-amber">
                Dados bancários não cadastrados. Acesse <strong>Verificação</strong> para completar seu cadastro.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal confirmar cancelamento */}
      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancelar pedido de saque"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setCancelId(null)}>Voltar</button>
            <button
              className="btn-danger"
              onClick={() => cancelWithdraw.mutate(cancelId!)}
              disabled={cancelWithdraw.isPending}
            >
              {cancelWithdraw.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-text2">
          Tem certeza que deseja cancelar este pedido de saque? O valor voltará a ficar disponível no seu saldo.
        </p>
      </Modal>
    </div>
  );
}

function AnticipationCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{
    hasRecipient    : boolean;
    enabled         : boolean;
    type            : string | null;
    volumePercentage: number;
    delay           : number;
    updatedAt       : string | null;
  }>({
    queryKey: ['my-anticipation'],
    queryFn : () => api.get('/financial/anticipation').then(r => r.data),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.put('/financial/anticipation', {
      enabled,
      type            : 'full',
      volumePercentage: 100,
      delay           : 0,
    }),
    onSuccess: (_, enabled) => {
      qc.invalidateQueries({ queryKey: ['my-anticipation'] });
      qc.invalidateQueries({ queryKey: ['my-balance'] });
      toast.success(enabled ? 'Antecipação ativada!' : 'Antecipação desativada');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao atualizar antecipação'),
  });

  if (isLoading || !data) return null;

  return (
    <div className="card mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${data.enabled ? 'bg-green/15 text-green' : 'bg-text3/15 text-text3'}`}>
            <Zap size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="section-title">Antecipação automática</span>
              <span className={data.enabled ? 'badge-green' : 'badge-amber'}>
                {data.enabled ? 'Ativada' : 'Desativada'}
              </span>
            </div>
            <p className="text-xs text-text3 mt-1 max-w-xl">
              Quando ativada, os recebíveis de cartão (normalmente D+30) viram saldo disponível
              <strong> imediatamente após a venda</strong>. Pagar.me cobra uma taxa de antecipação
              em cima desse valor — vale a pena se você precisa do cash mais rápido pra reinvestir.
            </p>
            {data.enabled && (
              <p className="text-[10px] text-text3 mt-1">
                Configuração: {data.type === 'full' ? '100% antecipável' : 'parcelado'} · volume {data.volumePercentage}% · delay {data.delay} dia(s)
              </p>
            )}
            {!data.hasRecipient && (
              <p className="text-[10px] text-amber mt-1">
                ⚠ Você precisa completar a Verificação (cadastro do recebedor Pagar.me) antes de ativar.
              </p>
            )}
          </div>
        </div>
        <button
          className={`btn-sm ${data.enabled ? 'btn-ghost' : 'btn-primary'}`}
          disabled={!data.hasRecipient || toggle.isPending}
          onClick={() => toggle.mutate(!data.enabled)}
        >
          {toggle.isPending ? 'Salvando…' : data.enabled ? 'Desativar' : 'Ativar antecipação'}
        </button>
      </div>
    </div>
  );
}