import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Loading, StatCard, TabNav, ConfirmDialog } from '@/components/ui';
import { formatBRL, formatDateTime } from '@/lib/utils';
import type { Withdrawal } from '@/types';
import { DollarSign, RefreshCw, ArrowDownCircle, Play } from 'lucide-react';

export default function FinancialPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('faturas');
  const [confirmRepasse, setConfirmRepasse] = useState(false);

  const { data: wl, isLoading: loadingWl } = useQuery({
    queryKey: ['invoices-wl'],
    queryFn : () => api.get('/financial/invoices-wl').then(r => r.data),
  });

  const { data: withdrawals, isLoading: loadingWd } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn : () => api.get('/financial/withdrawals?limit=50').then(r => r.data),
    enabled : tab === 'saques',
  });

  const { data: balanceAll } = useQuery({
    queryKey: ['balance-all'],
    queryFn : () => api.get('/financial/balance-all').then(r => r.data),
  });

  const repasseMutation = useMutation({
    mutationFn: () => api.post('/financial/repasse-auto'),
    onSuccess : (res) => {
      toast.success(`Repasse disparado — ${res.data?.processed || 0} pedidos processados`);
      qc.invalidateQueries({ queryKey: ['balance-all'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao disparar repasse'),
  });

  const approveWithdrawal = useMutation({
    mutationFn: (id: string) => api.post(`/financial/withdrawals/${id}/process`),
    onSuccess : () => { toast.success('Saque processado!'); qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <div>
      <PageHeader
        title="Financeiro"
        sub="Saques, repasses e faturas WL"
        actions={
          <button
            onClick={() => setConfirmRepasse(true)}
            disabled={repasseMutation.isPending}
            className="btn-primary btn-sm"
          >
            <Play size={14} /> Disparar repasse-auto
          </button>
        }
      />

      {/* KPIs gerais */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Volume total plataforma" value={formatBRL(balanceAll?.totalVolumeCents || 0)} icon={<DollarSign size={16} />} />
        <StatCard label="Faturas WL"              value={wl?.length || 0}                             icon={<RefreshCw size={16} />} />
        <StatCard label="Saques pendentes"        value={withdrawals?.data?.filter((w: any) => w.status === 'PENDING').length || 0} icon={<ArrowDownCircle size={16} />} />
      </div>

      <TabNav
        tabs={[
          { id: 'faturas', label: 'Faturas WL' },
          { id: 'saques',  label: 'Saques', badge: withdrawals?.data?.filter((w: any) => w.status === 'PENDING').length || undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'faturas' && (
        <div className="card">
          <div className="section-title mb-4">Faturas WL — Spread semanal</div>
          {loadingWl ? <Loading /> : (wl || []).length === 0 ? (
            <p className="text-sm text-text3">Nenhuma fatura gerada ainda.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Período</th><th>Volume</th><th>Spread</th><th>Valor</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {wl.map((inv: any) => (
                    <tr key={inv.id}>
                      <td>{formatDateTime(inv.periodStart)}</td>
                      <td>{formatBRL(inv.volumeCents)}</td>
                      <td>{inv.spreadBps / 100}%</td>
                      <td className="font-semibold text-text">{formatBRL(inv.amountCents)}</td>
                      <td><span className={inv.status === 'PAID' ? 'badge-green' : 'badge-amber'}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'saques' && (
        <div className="card">
          <div className="section-title mb-4">Solicitações de saque</div>
          {loadingWd ? <Loading /> : (withdrawals?.data || []).length === 0 ? (
            <p className="text-sm text-text3">Nenhum saque solicitado ainda.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Produtor</th><th>Valor</th><th>Chave Pix</th><th>Status</th><th>Data</th><th>Ação</th></tr>
                </thead>
                <tbody>
                  {(withdrawals.data as Withdrawal[]).map((w) => (
                    <tr key={w.id}>
                      <td className="font-mono text-xs text-text2">{w.userId.slice(-8)}</td>
                      <td className="font-semibold text-text">{formatBRL(w.amountCents)}</td>
                      <td className="text-xs text-text2 max-w-[150px] truncate">{w.pixKey}</td>
                      <td>
                        <span className={
                          w.status === 'PAID'       ? 'badge-green' :
                          w.status === 'PROCESSING' ? 'badge-blue'  :
                          w.status === 'FAILED'     ? 'badge-red'   : 'badge-amber'
                        }>
                          {w.status}
                        </span>
                      </td>
                      <td className="text-text3">{formatDateTime(w.createdAt)}</td>
                      <td>
                        {w.status === 'PENDING' && (
                          <button
                            onClick={() => approveWithdrawal.mutate(w.id)}
                            disabled={approveWithdrawal.isPending}
                            className="btn-success btn-sm"
                          >
                            Processar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmRepasse}
        onClose={() => setConfirmRepasse(false)}
        onConfirm={() => repasseMutation.mutate()}
        title="Disparar repasse automático"
        message="Isso processará todos os splits pendentes de pedidos aprovados. Continuar?"
        confirmLabel="Disparar"
      />
    </div>
  );
}