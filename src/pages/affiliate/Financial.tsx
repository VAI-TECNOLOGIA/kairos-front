import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, StatCard, Modal } from '@/components/ui';
import { formatBRL, formatDateTime } from '@/lib/utils';
import { DollarSign, ArrowDownCircle, Clock, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';

interface WithdrawForm {
  amountReais: string;
  pixKey     : string;
  pixKeyType : string;
  phone      : string;
}

export default function AffiliateFinancial() {
  const qc = useQueryClient();
  const [openSaque, setOpenSaque] = useState(false);
  const [showBal, setShowBal]     = useState(true);
  const [cancelId, setCancelId]   = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn : () => api.get('/affiliates/my-stats').then(r => r.data),
  });

  const { data: splits } = useQuery({
    queryKey: ['affiliate-splits'],
    queryFn : () => api.get('/financial/splits?limit=50').then(r => r.data),
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['affiliate-withdrawals'],
    queryFn : () => api.get('/financial/withdrawals?limit=20').then(r => r.data),
  });

  const available      = stats?.availableCents || 0;
  const splitList      = splits?.data || [];
  const withdrawalList: any[] = withdrawals?.data || [];
  const hasPending     = withdrawalList.some((w: any) => w.status === 'PENDING');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<WithdrawForm>({
    defaultValues: { amountReais: '', pixKey: '', pixKeyType: 'email', phone: '' },
  });

  const amountReais    = watch('amountReais');
  const amountNum      = parseFloat((amountReais || '0').replace(',', '.')) || 0;
  const amountCents    = Math.round(amountNum * 100);
  const aboveMin       = amountCents >= 5000;
  const aboveAvailable = amountCents <= available;
  const canSubmit      = aboveMin && aboveAvailable && !hasPending;

  const withdraw = useMutation({
    mutationFn: (d: WithdrawForm) => api.post('/financial/withdraw', {
      amountCents: Math.round(parseFloat(d.amountReais.replace(',', '.')) * 100),
      pixKey     : d.pixKey,
      pixKeyType : d.pixKeyType,
      phone      : d.phone,
    }),
    onSuccess: () => {
      toast.success('Saque solicitado! O admin irá processar em breve.');
      qc.invalidateQueries({ queryKey: ['affiliate-stats'] });
      qc.invalidateQueries({ queryKey: ['affiliate-withdrawals'] });
      setOpenSaque(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const cancelWithdraw = useMutation({
    mutationFn: (id: string) => api.delete(`/financial/withdrawals/${id}`),
    onSuccess: () => {
      toast.success('Pedido de saque cancelado.');
      qc.invalidateQueries({ queryKey: ['affiliate-stats'] });
      qc.invalidateQueries({ queryKey: ['affiliate-withdrawals'] });
      setCancelId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao cancelar'),
  });

  const statusVariant = (s: string) => {
    if (s === 'PAID')       return 'badge-green';
    if (s === 'PROCESSING') return 'badge-blue';
    if (s === 'FAILED')     return 'badge-red';
    return 'badge-amber';
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
        sub="Suas comissões e saques"
        actions={
          <button
            onClick={() => {
              if (hasPending) { toast.error('Você já tem um saque pendente. Aguarde o processamento.'); return; }
              if (available < 5000) { toast.error('Saldo insuficiente. Mínimo para saque: R$ 50,00'); return; }
              setOpenSaque(true);
            }}
            className={`btn-primary btn-sm ${(hasPending || available < 5000) ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <ArrowDownCircle size={14} /> Solicitar saque
          </button>
        }
      />

      {hasPending && (
        <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-[10px] p-3 mb-4">
          <AlertCircle size={15} className="text-amber flex-shrink-0" />
          <span className="text-sm text-amber">
            Você tem um saque pendente de aprovação. Novos saques só poderão ser solicitados após a conclusão.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
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
          <div className={`text-[10px] mt-0.5 ${available >= 5000 ? 'text-green' : 'text-text3'}`}>
            {available >= 5000 ? 'Disponível para saque' : 'Mínimo R$ 50,00 para sacar'}
          </div>
        </div>
        <StatCard
          label="Comissões pendentes"
          value={formatBRL(stats?.pendingCents || 0)}
          sub="aguardando confirmação"
          icon={<Clock size={16} />}
        />
        <StatCard
          label="Total sacado"
          value={formatBRL(withdrawalList.filter((w: any) => w.status === 'PAID').reduce((s: number, w: any) => s + w.amountCents, 0))}
          sub="saques processados"
          icon={<DollarSign size={16} />}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="section-title mb-4">Histórico de comissões</div>
          <div className="space-y-2">
            {splitList.length === 0 ? (
              <p className="text-sm text-text3 text-center py-4">Nenhuma comissão ainda</p>
            ) : splitList.map((s: any) => (
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

        <div className="card">
          <div className="section-title mb-4">Meus saques</div>
          {withdrawalList.length === 0 ? (
            <p className="text-sm text-text3 text-center py-4">Nenhum saque solicitado</p>
          ) : (
            <div className="space-y-2">
              {withdrawalList.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text">{formatBRL(w.amountCents)}</div>
                    <div className="text-[10px] text-text3">{w.pixKey} · {formatDateTime(w.createdAt)}</div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal solicitar saque */}
      <Modal
        open={openSaque}
        onClose={() => { setOpenSaque(false); reset(); }}
        title="Solicitar Saque"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setOpenSaque(false); reset(); }}>Cancelar</button>
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
          <div className="bg-bg3 rounded-[7px] p-3 flex items-center justify-between">
            <span className="text-sm text-text2">Disponível para saque</span>
            <span className="font-bold text-green">{formatBRL(available)}</span>
          </div>

          <div className="form-group">
            <label className="label">Valor (mínimo R$ 50,00)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-sm">R$</span>
              <input
                {...register('amountReais', {
                  required: 'Obrigatório',
                  validate: v => {
                    const n = parseFloat(v.replace(',', '.'));
                    if (isNaN(n) || n < 50) return 'Valor mínimo para saque é R$ 50,00';
                    if (Math.round(n * 100) > available) return `Valor excede o saldo disponível (${formatBRL(available)})`;
                    return true;
                  },
                })}
                className={`input pl-9 ${errors.amountReais ? 'border-red focus:border-red' : amountNum > 0 && aboveMin && aboveAvailable ? 'border-green/50' : ''}`}
                placeholder="50,00"
                inputMode="decimal"
              />
            </div>
            {errors.amountReais ? (
              <span className="text-xs text-red flex items-center gap-1 mt-1">⚠ {errors.amountReais.message}</span>
            ) : amountNum > 0 && aboveMin && aboveAvailable ? (
              <span className="text-xs text-green mt-1 block">✓ {formatBRL(amountCents)} será transferido para sua chave Pix</span>
            ) : null}
          </div>

          <div className="form-group">
            <label className="label">Tipo de chave Pix</label>
            <select {...register('pixKeyType')} className="input">
              <option value="email">E-mail</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="phone">Telefone</option>
              <option value="random">Chave aleatória</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Chave Pix</label>
            <input {...register('pixKey', { required: 'Obrigatório' })} className="input" placeholder="email, CPF ou chave aleatória" />
            {errors.pixKey && <span className="text-xs text-red">{errors.pixKey.message}</span>}
            <p className="text-xs text-amber/80 flex items-center gap-1 mt-1.5">
              ⚠ Confira se a chave Pix está correta. Transferências para chaves erradas não podem ser revertidas.
            </p>
          </div>

          <div className="form-group">
            <label className="label">WhatsApp para notificação</label>
            <input {...register('phone', { required: 'Obrigatório para receber confirmação' })} className="input" placeholder="(47) 99999-9999" inputMode="tel" />
            <p className="text-xs text-text3 mt-1">Você receberá uma mensagem quando o saque for processado</p>
            {errors.phone && <span className="text-xs text-red">{errors.phone.message}</span>}
          </div>
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
            <button className="btn-danger" onClick={() => cancelWithdraw.mutate(cancelId!)} disabled={cancelWithdraw.isPending}>
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