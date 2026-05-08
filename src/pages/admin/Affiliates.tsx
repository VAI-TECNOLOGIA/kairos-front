import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState, DateCell, WhatsAppLink } from '@/components/ui';
import type { Affiliate } from '@/types';
import { Link2, CheckCircle, XCircle, Clock, Users, Trash2, Search, UserPlus, ChevronDown } from 'lucide-react';

type LookupUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PRODUCER' | 'AFFILIATE' | 'CUSTOMER' | 'STAFF' | 'USER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  affiliate: { id: string; code: string; status: string; isActive: boolean } | null;
  producer : { id: string; kycStatus: string } | null;
};

export default function AffiliatesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const { register: regReject, handleSubmit: handleReject, reset: resetReject } = useForm();
  const [showPromote, setShowPromote] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [foundUser, setFoundUser] = useState<LookupUser | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  const lookup = useMutation({
    mutationFn: (email: string) => api.get(`/admin/users/lookup?email=${encodeURIComponent(email)}`).then(r => r.data as LookupUser),
    onSuccess : (u) => { setFoundUser(u); setLookupErr(null); },
    onError   : (e: any) => {
      setFoundUser(null);
      setLookupErr(e?.response?.data?.message || 'Usuário não encontrado');
    },
  });

  const promote = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/promote-affiliate`).then(r => r.data),
    onSuccess : (data) => {
      toast.success(data?.message || 'Cliente promovido a afiliado!');
      setFoundUser(null);
      setPromoteEmail('');
      setShowPromote(false);
      qc.invalidateQueries({ queryKey: ['admin-affiliates'] });
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao promover'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn : () => api.get('/affiliates/pending').then(r => r.data),
  });

  // Toggle global: aprovação automática de novos cadastros via /seja-afiliado
  const { data: settings } = useQuery<Record<string, any>>({
    queryKey: ['admin-settings'],
    queryFn : () => api.get('/admin/settings').then(r => r.data),
  });
  const autoApprove = settings?.['affiliate.auto_approve'] === true ||
                      settings?.['affiliate.auto_approve']?.enabled === true;

  const setAutoApprove = useMutation({
    mutationFn: (enabled: boolean) =>
      api.patch('/admin/settings', { 'affiliate.auto_approve': enabled }),
    onSuccess: (_data, enabled) => {
      toast.success(enabled ? 'Aprovação automática ATIVADA' : 'Aprovação automática DESATIVADA');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
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

      {/* Toggle aprovação automática */}
      <div className={`mb-4 border rounded-[7px] p-4 flex items-center gap-3 ${autoApprove ? 'border-green/40 bg-green/5' : 'border-border bg-bg3/40'}`}>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove.mutate(e.target.checked)}
            disabled={setAutoApprove.isPending}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-bg3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green" />
        </label>
        <div className="flex-1">
          <div className="text-sm font-semibold text-text">
            Aprovação automática de afiliados
            {autoApprove && <span className="ml-2 badge-green text-[10px]">ATIVO</span>}
          </div>
          <div className="text-xs text-text3">
            Quando ativado, novos cadastros via <code>/seja-afiliado</code> entram já como APROVADO sem precisar de aprovação manual.
          </div>
        </div>
      </div>

      {/* Promover cliente existente para afiliado — útil quando alguém já comprou
          como customer e depois quer virar afiliado (não pode usar /seja-afiliado pq
          o email já existe no banco). */}
      <div className="mb-6 border border-border rounded-[7px] overflow-hidden bg-bg3/40">
        <button
          type="button"
          onClick={() => setShowPromote(v => !v)}
          className="w-full px-4 py-3 flex items-center gap-2 text-sm font-semibold text-text2 hover:bg-bg3/60 transition-colors"
          aria-expanded={showPromote}
        >
          <UserPlus size={15} className="text-accent" />
          <span>Promover cliente para afiliado</span>
          <span className="text-[11px] text-text3 font-normal">— quando o email já existe como CUSTOMER</span>
          <ChevronDown size={15} className={`ml-auto text-text3 transition-transform ${showPromote ? 'rotate-180' : ''}`} />
        </button>

        {showPromote && (
          <div className="p-4 border-t border-border space-y-3 animate-fade-in">
            <div className="flex gap-2 items-stretch">
              <input
                type="email"
                inputMode="email"
                className="input flex-1"
                placeholder="email@cliente.com"
                value={promoteEmail}
                onChange={(e) => { setPromoteEmail(e.target.value); setFoundUser(null); setLookupErr(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && promoteEmail) lookup.mutate(promoteEmail.trim()); }}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => promoteEmail && lookup.mutate(promoteEmail.trim())}
                disabled={!promoteEmail || lookup.isPending}
              >
                <Search size={14} /> {lookup.isPending ? 'Buscando…' : 'Buscar'}
              </button>
            </div>

            {lookupErr && (
              <div className="text-sm text-amber bg-amber/10 border border-amber/30 rounded-md px-3 py-2">
                {lookupErr}
              </div>
            )}

            {foundUser && (
              <div className="border border-border rounded-md p-3 bg-bg2 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-medium text-text">{foundUser.name}</div>
                  <span className="text-xs text-text3">{foundUser.email}</span>
                  <span className={
                    foundUser.role === 'CUSTOMER' ? 'badge-blue' :
                    foundUser.role === 'AFFILIATE' ? 'badge-green' :
                    foundUser.role === 'PRODUCER'  ? 'badge-purple' :
                    'badge-gray'
                  }>{foundUser.role}</span>
                  {!foundUser.isActive && <span className="badge-gray">inativo</span>}
                </div>
                <div className="text-xs text-text3">
                  Criado em {new Date(foundUser.createdAt).toLocaleDateString('pt-BR')}
                  {foundUser.lastLoginAt && ` · último login ${new Date(foundUser.lastLoginAt).toLocaleDateString('pt-BR')}`}
                </div>

                {foundUser.affiliate && (
                  <div className="text-sm text-amber bg-amber/10 border border-amber/30 rounded px-3 py-2">
                    Já é afiliado · código <code>{foundUser.affiliate.code}</code> · status {foundUser.affiliate.status}
                  </div>
                )}
                {foundUser.producer && (
                  <div className="text-sm text-amber bg-amber/10 border border-amber/30 rounded px-3 py-2">
                    Usuário é produtor (KYC {foundUser.producer.kycStatus}) — não é possível promover a afiliado.
                  </div>
                )}
                {(foundUser.role === 'ADMIN' || foundUser.role === 'STAFF') && (
                  <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
                    Admin/Staff não pode ser promovido a afiliado.
                  </div>
                )}
                {!foundUser.affiliate && !foundUser.producer && foundUser.role !== 'ADMIN' && foundUser.role !== 'STAFF' && (
                  <button
                    type="button"
                    className="btn-success btn-sm"
                    onClick={() => promote.mutate(foundUser.id)}
                    disabled={promote.isPending}
                  >
                    <UserPlus size={14} /> {promote.isPending ? 'Promovendo…' : `Promover ${foundUser.name} a afiliado`}
                  </button>
                )}
              </div>
            )}

            <div className="text-[11px] text-text3">
              Cria registro Affiliate APROVADO (status=APPROVED, isActive=true) e muda role do User para AFFILIATE.
              Notifica via WhatsApp pelo canal AFILIADO da VAI.
            </div>
          </div>
        )}
      </div>

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
