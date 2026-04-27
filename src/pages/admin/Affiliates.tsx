import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState, DateCell, WhatsAppLink } from '@/components/ui';
import type { Affiliate } from '@/types';
import { Link2, CheckCircle, XCircle, Clock, Users, Trash2 } from 'lucide-react';

export default function AffiliatesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const { register: regReject, handleSubmit: handleReject, reset: resetReject } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn : () => api.get('/affiliates/pending').then(r => r.data),
  });

  const all: Affiliate[] = Array.isArray(data) ? data : [];
  const pendingList  = all.filter((a: any) => a.status === 'PENDING');
  const approvedList = all.filter((a: any) => a.status === 'APPROVED');
  const rejectedList = all.filter((a: any) => a.status === 'REJECTED');

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/affiliates/${id}/approve`),
    onSuccess: () => {
      toast.success('Afiliado aprovado!');
      qc.invalidateQueries({ queryKey: ['admin-affiliates'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao aprovar'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/affiliates/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Afiliado rejeitado.');
      qc.invalidateQueries({ queryKey: ['admin-affiliates'] });
      setRejectId(null);
      resetReject();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao rejeitar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/affiliates/${id}`),
    onSuccess : () => {
      toast.success('Afiliado excluído permanentemente');
      qc.invalidateQueries({ queryKey: ['admin-affiliates'] });
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao excluir'),
  });

  const askDelete = (a: any) => {
    const ok = window.confirm(
      `Excluir ${a.user.name} (${a.user.email}) permanentemente?\n\n` +
      `Esta ação apaga User + Affiliate + dados vinculados.\n` +
      `Bloqueado se houver inscrições/rastreamentos no histórico.`
    );
    if (ok) remove.mutate(a.id);
  };

  return (
    <div>
      <PageHeader
        title="Afiliados"
        sub={`${pendingList.length} aguardando análise · ${approvedList.length} ativos · ${all.length} total`}
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'pending',  icon: Clock,       label: 'Aguardando',  count: pendingList.length  },
          { id: 'approved', icon: CheckCircle, label: 'Aprovados',   count: approvedList.length },
          { id: 'rejected', icon: XCircle,     label: 'Rejeitados',  count: rejectedList.length },
        ].map(t => (
          <button
            key={t.id}
            className={`btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id as any)}
          >
            <t.icon size={13} />
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 bg-bg3 text-[11px] rounded-full px-1.5 py-0.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? <Loading /> : (
        <>
          {/* ── AGUARDANDO ─────────────────────────── */}
          {tab === 'pending' && (
            pendingList.length === 0 ? (
              <EmptyState icon={<Users size={32} />} title="Nenhum afiliado aguardando" />
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Cadastro</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {pendingList.map((a: any) => (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-text truncate">{a.user.name}</span>
                            <WhatsAppLink phone={a.user.phone} />
                          </div>
                        </td>
                        <td className="text-text2">{a.user.email}</td>
                        <td className="text-text2">{a.user.phone || '—'}</td>
                        <td><DateCell date={a.createdAt} /></td>
                        <td>
                          {rejectId === a.id ? (
                            <form
                              onSubmit={handleReject(d => reject.mutate({ id: a.id, reason: (d as any).reason }))}
                              className="flex gap-2 items-center"
                            >
                              <input className="input text-xs py-1 h-7" placeholder="Motivo (opcional)" {...regReject('reason')} />
                              <button type="submit" className="btn-danger btn-sm" disabled={reject.isPending}>Confirmar</button>
                              <button type="button" className="btn-secondary btn-sm" onClick={() => { setRejectId(null); resetReject(); }}>Cancelar</button>
                            </form>
                          ) : (
                            <div className="flex gap-2">
                              <button className="btn-success btn-sm" onClick={() => approve.mutate(a.id)} disabled={approve.isPending}>
                                <CheckCircle size={12} /> Aprovar
                              </button>
                              <button className="btn-danger btn-sm" onClick={() => setRejectId(a.id)}>
                                <XCircle size={12} /> Rejeitar
                              </button>
                              <button
                                className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10"
                                onClick={() => askDelete(a)}
                                disabled={remove.isPending}
                                title="Excluir permanentemente"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── APROVADOS ─────────────────────────── */}
          {tab === 'approved' && (
            approvedList.length === 0 ? (
              <EmptyState icon={<Link2 size={32} />} title="Nenhum afiliado aprovado" />
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Nome</th><th>Email</th><th>Código</th><th>Status</th><th>Aprovado em</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {approvedList.map((a: any) => (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-text truncate">{a.user.name}</span>
                            <WhatsAppLink phone={a.user.phone} />
                          </div>
                        </td>
                        <td className="text-text2">{a.user.email}</td>
                        <td><code className="text-xs bg-bg3 px-2 py-0.5 rounded text-accent">{a.code}</code></td>
                        <td><span className={a.isActive ? 'badge-green' : 'badge-gray'}>{a.isActive ? 'Ativo' : 'Inativo'}</span></td>
                        <td><DateCell date={a.approvedAt} /></td>
                        <td>
                          <button
                            className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10"
                            onClick={() => askDelete(a)}
                            disabled={remove.isPending}
                            title="Excluir permanentemente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── REJEITADOS ─────────────────────────── */}
          {tab === 'rejected' && (
            rejectedList.length === 0 ? (
              <EmptyState icon={<XCircle size={32} />} title="Nenhum afiliado rejeitado" />
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Nome</th><th>Email</th><th>Motivo</th><th>Rejeitado em</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {rejectedList.map((a: any) => (
                      <tr key={a.id}>
                        <td className="font-medium text-text">{a.user.name}</td>
                        <td className="text-text2">{a.user.email}</td>
                        <td className="text-text3 text-xs">{a.rejectedReason || '—'}</td>
                        <td><DateCell date={a.rejectedAt} /></td>
                        <td>
                          <button
                            className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10"
                            onClick={() => askDelete(a)}
                            disabled={remove.isPending}
                            title="Excluir permanentemente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
