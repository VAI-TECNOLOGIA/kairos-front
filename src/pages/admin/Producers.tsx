import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Modal, TabNav, EmptyState, Loading, DateCell, WhatsAppLink } from '@/components/ui';
import { kycStatusVariant, formatDate } from '@/lib/utils';
import type { Producer } from '@/types';
import { Users, CheckCircle, XCircle, Eye, LogIn, Unlock, Lock, Copy, ExternalLink } from 'lucide-react';

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
  const [impersonateLink, setImpersonateLink] = useState<{ url: string; target: { name: string; email: string; role: string } } | null>(null);

  const impersonate = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/impersonate-link`).then(r => r.data),
    onSuccess: (data) => {
      setImpersonateLink({ url: data.url, target: data.target });
      navigator.clipboard.writeText(data.url).catch(() => {});
      toast.success('Link copiado — cole em uma aba anônima');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao gerar link'),
  });

  const unlockUser = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/unlock`).then(r => r.data),
    onSuccess : (data) => {
      toast.success(data.wasLocked ? 'Conta desbloqueada' : 'Conta já estava liberada');
      qc.invalidateQueries({ queryKey: ['admin-producers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao desbloquear'),
  });

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
                  <td>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-text truncate">{p.user.name}</span>
                      <WhatsAppLink phone={p.user.phone} />
                      {(() => {
                        const u = p.user as any;
                        const isLocked = u?.lockedUntil && new Date(u.lockedUntil) > new Date();
                        if (!isLocked) return null;
                        return (
                          <span title={`Bloqueada até ${new Date(u.lockedUntil).toLocaleString('pt-BR')}`} className="inline-flex items-center gap-1 text-[10px] bg-red/15 text-red px-1.5 py-0.5 rounded">
                            <Lock size={10} /> bloqueada
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td>{p.user.email}</td>
                  <td>{p.companyName || '—'}</td>
                  <td><span className={kycStatusVariant(p.kycStatus)}>{p.kycStatus}</span></td>
                  <td><DateCell date={p.createdAt} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelected(p); setShowReject(false); }}
                        className="btn-ghost btn-sm p-1.5"
                        title="Ver detalhes"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => impersonate.mutate(p.user.id)}
                        disabled={impersonate.isPending}
                        className="btn-ghost btn-sm p-1.5"
                        title="Acessar conta (gerar link)"
                      >
                        <LogIn size={14} />
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
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelected(null)} className="btn-ghost btn-sm">Fechar</button>
                {(() => {
                  const u = selected.user as any;
                  const isLocked = u?.lockedUntil && new Date(u.lockedUntil) > new Date();
                  const hasFails = (u?.failedAttempts || 0) > 0;
                  if (!isLocked && !hasFails) return null;
                  return (
                    <button
                      onClick={() => unlockUser.mutate(u.id)}
                      disabled={unlockUser.isPending}
                      className="btn-amber btn-sm"
                      title={isLocked ? `Bloqueado até ${new Date(u.lockedUntil).toLocaleString('pt-BR')}` : `${u.failedAttempts} tentativas inválidas`}
                    >
                      <Unlock size={13} /> {unlockUser.isPending ? 'Liberando...' : 'Desbloquear conta'}
                    </button>
                  );
                })()}
                <button
                  onClick={() => {
                    if (confirm(`Você vai entrar como ${selected.user.name}. Suas ações serão registradas no audit log. Continuar?`)) {
                      impersonate.mutate(selected.user.id);
                    }
                  }}
                  disabled={impersonate.isPending}
                  className="btn-secondary btn-sm"
                  title="Entra como o produtor (auditado)"
                >
                  <LogIn size={13} /> {impersonate.isPending ? 'Entrando...' : 'Login como produtor'}
                </button>
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

      {/* Modal: link de impersonate */}
      <Modal open={!!impersonateLink} onClose={() => setImpersonateLink(null)} title="Acessar conta — link gerado">
        {impersonateLink && (
          <div className="space-y-4">
            <div className="bg-amber/10 border border-amber/30 rounded p-3 text-xs text-amber">
              <strong>Recomendado: abra em uma janela anônima.</strong> Assim você não desloga sua sessão de admin.
              O link expira em 5 minutos.
            </div>

            <div>
              <div className="text-xs text-text3 mb-1">Acessando como:</div>
              <div className="text-sm font-medium text-text">{impersonateLink.target.name}</div>
              <div className="text-xs text-text2">{impersonateLink.target.email} · <code className="text-accent">{impersonateLink.target.role}</code></div>
            </div>

            <div className="form-group">
              <label className="label">Link</label>
              <div className="flex gap-2">
                <input className="input flex-1 font-mono text-xs" readOnly value={impersonateLink.url} onClick={e => (e.target as HTMLInputElement).select()} />
                <button
                  onClick={() => { navigator.clipboard.writeText(impersonateLink.url); toast.success('Link copiado'); }}
                  className="btn-secondary btn-sm"
                  title="Copiar"
                >
                  <Copy size={13} />
                </button>
                <a href={impersonateLink.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" title="Abrir em nova aba">
                  <ExternalLink size={13} />
                </a>
              </div>
              <p className="text-[11px] text-text3 mt-1">Cole na barra de endereços de uma janela anônima — o login é automático.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}