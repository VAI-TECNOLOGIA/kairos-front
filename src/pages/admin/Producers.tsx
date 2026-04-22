import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Modal, TabNav, EmptyState, Loading } from '@/components/ui';
import { formatDate, kycStatusVariant } from '@/lib/utils';
import type { Producer } from '@/types';
import { Users, CheckCircle, XCircle, Eye } from 'lucide-react';

// FIX F-19: mapeamento completo de tab → status
function tabToStatus(tab: string): string | undefined {
  switch (tab) {
    case 'pending'  : return 'PENDING';
    case 'docs'     : return 'DOCUMENTS_SENT';
    case 'approved' : return 'APPROVED';   // ← estava faltando
    case 'rejected' : return 'REJECTED';
    default         : return undefined;    // 'all' → sem filtro
  }
}

export default function ProducersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<Producer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-producers', tab],
    queryFn: () => {
      const status = tabToStatus(tab);
      const qs = status ? `?status=${status}` : '';
      return api.get(`/producers${qs}`).then(r => r.data);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/producers/${id}/approve`),
    onMutate : () => { toast.loading('Aprovando produtor...', { id: 'producer-approve' }); },
    onSuccess: () => {
      toast.success('Produtor aprovado!', { id: 'producer-approve' });
      qc.invalidateQueries({ queryKey: ['admin-producers'] });
      qc.invalidateQueries({ queryKey: ['admin-producers-pending-count'] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao aprovar', { id: 'producer-approve' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/producers/${id}/reject`, { reason }),
    onMutate : () => { toast.loading('Rejeitando...', { id: 'producer-reject' }); },
    onSuccess: () => {
      toast.success('Produtor rejeitado.', { id: 'producer-reject' });
      qc.invalidateQueries({ queryKey: ['admin-producers'] });
      qc.invalidateQueries({ queryKey: ['admin-producers-pending-count'] });
      setSelected(null);
      setShowReject(false);
      setRejectReason('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Informe um motivo com mínimo 10 caracteres', { id: 'producer-reject' }),
  });

  const producers: Producer[] = data?.data || [];

  // Contar pendentes para badge da tab
  const { data: pendingData } = useQuery({
    queryKey: ['admin-producers-pending-count'],
    queryFn: () => api.get('/producers?status=PENDING').then(r => r.data),
    staleTime: 30_000,
  });
  const pendingCount = pendingData?.total || 0;

  return (
    <div>
      <PageHeader title="Produtores" sub="Gestão de KYC e aprovações" />

      <TabNav
        tabs={[
          { id: 'all',      label: 'Todos' },
          { id: 'pending',  label: 'Pendentes',     badge: pendingCount || undefined },
          { id: 'docs',     label: 'Docs enviados' },
          { id: 'approved', label: 'Aprovados' },
          { id: 'rejected', label: 'Rejeitados' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {isLoading ? <Loading /> : producers.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="Nenhum produtor" sub="Os cadastros aparecem aqui." />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th><th>Email</th><th>Empresa</th>
                <th>Status KYC</th><th>Cadastro</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {producers.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-text">{p.user.name}</td>
                  <td>{p.user.email}</td>
                  <td>{p.companyName || '—'}</td>
                  <td><span className={kycStatusVariant(p.kycStatus)}>{p.kycStatus}</span></td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelected(p); setShowReject(false); }}
                        className="btn-ghost btn-sm p-1.5"
                        title="Ver detalhes"
                      >
                        <Eye size={14} />
                      </button>
                      {['PENDING', 'DOCUMENTS_SENT'].includes(p.kycStatus) && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(p.id)}
                            disabled={approveMutation.isPending}
                            className="btn-success btn-sm"
                            title="Aprovar KYC"
                          >
                            <CheckCircle size={13} />
                          </button>
                          <button
                            onClick={() => { setSelected(p); setShowReject(true); }}
                            className="btn-danger btn-sm"
                            title="Rejeitar"
                          >
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalhes / rejeição */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setShowReject(false); setRejectReason(''); }}
        title={showReject ? 'Rejeitar Produtor' : 'Detalhes do Produtor'}
        footer={
          selected ? (
            showReject ? (
              <div className="flex gap-2 w-full">
                <button className="btn-ghost" onClick={() => setShowReject(false)}>Voltar</button>
                <button
                  onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason })}
                  disabled={rejectReason.length < 10 || rejectMutation.isPending}
                  className="btn-danger"
                >
                  Confirmar rejeição
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setSelected(null)} className="btn-ghost btn-sm">Fechar</button>
                {['PENDING', 'DOCUMENTS_SENT'].includes(selected.kycStatus) && (
                  <>
                    <button onClick={() => setShowReject(true)} className="btn-danger btn-sm">
                      Rejeitar
                    </button>
                    <button
                      onClick={() => approveMutation.mutate(selected.id)}
                      disabled={approveMutation.isPending}
                      className="btn-success btn-sm"
                    >
                      Aprovar KYC
                    </button>
                  </>
                )}
              </div>
            )
          ) : null
        }
      >
        {selected && (
          showReject ? (
            <div className="space-y-3">
              <p className="text-sm text-text2">
                Rejeitar produtor <strong className="text-text">{selected.user.name}</strong>.
                O motivo será enviado por email.
              </p>
              <div className="form-group">
                <label className="label">Motivo da rejeição (mínimo 10 caracteres) *</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Descreva o motivo da rejeição..."
                />
                <span className="text-xs text-text3">{rejectReason.length}/10 mínimo</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {[
                ['Nome',     selected.user.name],
                ['Email',    selected.user.email],
                ['Empresa',  selected.companyName || '—'],
                ['Status',   selected.kycStatus],
                ['Cadastro', formatDate(selected.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-text3">{k}</span>
                  <span className="font-medium text-text">{v}</span>
                </div>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  );
}