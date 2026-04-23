import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Modal, EmptyState, Loading } from '@/components/ui';
import { formatDate, kycStatusVariant } from '@/lib/utils';
import { Shield, CheckCircle2, AlertTriangle, XCircle, RotateCcw, FileText, ExternalLink, User, Banknote, ClipboardCheck } from 'lucide-react';

type ProducerListItem = {
  id: string;
  kycStatus: 'PENDING' | 'DOCUMENTS_SENT' | 'APPROVED' | 'REJECTED';
  companyName: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

type KycFull = {
  id: string;
  user: { id: string; name: string; email: string; phone: string | null; document: string | null; createdAt: string };
  companyName: string | null;
  kycStatus: string;
  isActive: boolean;
  approvedAt: string | null;
  rejectedReason: string | null;
  pagarmeRecipientId: string | null;
  pagarmeBankAccountId: string | null;
  pagarmeRecipientStatus: string | null;
  bankData: any;
  registerInformation: any;
  documents: {
    id: string;
    type: string;
    url: string;
    uploadedAt: string;
    status: 'PENDING' | 'APPROVED' | 'NEEDS_ADJUSTMENT' | 'REJECTED';
    reviewedAt: string | null;
    adjustmentReason: string | null;
    rejectionReason: string | null;
  }[];
};

const DOC_LABEL: Record<string, string> = {
  RG                      : 'RG / CNH',
  COMPROVANTE_RESIDENCIA  : 'Comprovante de residência',
  CONTRATO_SOCIAL         : 'Contrato social',
  CARTAO_CNPJ             : 'Cartão CNPJ',
  SELFIE                  : 'Selfie com documento',
};

export default function KycReview() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'approved' | 'rejected'>('all');

  const { data: listData, isLoading } = useQuery({
    queryKey: ['admin-kyc-list'],
    queryFn : () => api.get('/producers').then(r => r.data),
  });
  const producers: ProducerListItem[] = listData?.data || [];

  const filtered = producers.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'pending')   return p.kycStatus === 'PENDING';
    if (filter === 'reviewing') return p.kycStatus === 'DOCUMENTS_SENT';
    if (filter === 'approved')  return p.kycStatus === 'APPROVED';
    if (filter === 'rejected')  return p.kycStatus === 'REJECTED';
    return true;
  });

  return (
    <div>
      <PageHeader title="Verificação de Produtores" sub="Revise documentos, aprove/rejeite e solicite ajustes." />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { k: 'all',       label: `Todos (${producers.length})` },
          { k: 'pending',   label: 'Aguardando docs' },
          { k: 'reviewing', label: 'Em análise' },
          { k: 'approved',  label: 'Aprovados' },
          { k: 'rejected',  label: 'Rejeitados' },
        ].map(f => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k as any)}
            className={`btn-sm ${filter === f.k ? 'btn-primary' : 'btn-ghost'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon={<Shield size={32} />} title="Nenhum produtor" sub="Nenhum resultado para o filtro selecionado." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="card p-4 text-left hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text truncate">{p.user.name}</div>
                  <div className="text-sm text-text3 truncate">{p.user.email}</div>
                </div>
                <span className={kycStatusVariant(p.kycStatus)}>{p.kycStatus}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-text3">
                <span>{p.companyName || '—'}</span>
                <span>{formatDate(p.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <KycDetailModal
          producerId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['admin-kyc-list'] });
            qc.invalidateQueries({ queryKey: ['admin-producers-pending-count'] });
          }}
        />
      )}
    </div>
  );
}

// ── MODAL DETALHE ────────────────────────────────────────────────
function KycDetailModal({ producerId, onClose, onChanged }: {
  producerId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'docs' | 'register' | 'bank'>('docs');
  const [adjustDoc, setAdjustDoc] = useState<{ id: string; type: string } | null>(null);
  const [adjustReason, setAdjustReason] = useState('');
  const [showRevoke, setShowRevoke] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: kyc, isLoading } = useQuery<KycFull>({
    queryKey: ['admin-kyc-detail', producerId],
    queryFn : () => api.get(`/producers/${producerId}/kyc-full`).then(r => r.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-kyc-detail', producerId] });
    onChanged();
  };

  const approveDoc = useMutation({
    mutationFn: (docId: string) => api.post(`/producers/${producerId}/documents/${docId}/approve`),
    onSuccess : () => { toast.success('Documento aprovado'); refresh(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const requestAdjust = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      api.post(`/producers/${producerId}/documents/${docId}/request-adjustment`, { reason }),
    onSuccess : () => {
      toast.success('Ajuste solicitado — produtor foi notificado');
      setAdjustDoc(null); setAdjustReason(''); refresh();
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const rejectDoc = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      api.post(`/producers/${producerId}/documents/${docId}/reject`, { reason }),
    onSuccess : () => { toast.success('Documento rejeitado'); refresh(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const approveProducer = useMutation({
    mutationFn: () => api.post(`/producers/${producerId}/approve`),
    onMutate  : () => { toast.loading('Criando recebedor no Pagar.me...', { id: 'prod-approve' }); },
    onSuccess : (r: any) => {
      toast.success(`Aprovado! Recebedor: ${r.data?.pagarmeRecipientId || r.data?.producer?.pagarmeRecipientId}`, { id: 'prod-approve' });
      refresh();
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao aprovar', { id: 'prod-approve' }),
  });

  const revokeApproval = useMutation({
    mutationFn: (reason: string) => api.post(`/producers/${producerId}/revoke-approval`, { reason }),
    onSuccess : () => {
      toast.success('Aprovação revogada');
      setShowRevoke(false); setRevokeReason(''); refresh();
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const allDocsApproved = kyc?.documents.length ? kyc.documents.every(d => d.status === 'APPROVED') : false;

  return (
    <Modal open onClose={onClose} title={kyc ? `${kyc.user.name} — Verificação` : 'Carregando...'}>
      {isLoading || !kyc ? <Loading /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={kycStatusVariant(kyc.kycStatus)}>{kyc.kycStatus}</span>
              {kyc.pagarmeRecipientId && (
                <span className="text-xs text-text2">
                  Pagar.me: <code className="text-accent">{kyc.pagarmeRecipientId}</code>{' '}
                  <span className="text-text3">({kyc.pagarmeRecipientStatus || '-'})</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {kyc.kycStatus === 'APPROVED' ? (
                <button onClick={() => setShowRevoke(true)} className="btn-danger btn-sm">
                  <RotateCcw size={13} className="mr-1" /> Cancelar aprovação
                </button>
              ) : (
                <button
                  onClick={() => approveProducer.mutate()}
                  disabled={!allDocsApproved || approveProducer.isPending}
                  className="btn-success btn-sm"
                  title={!allDocsApproved ? 'Aprove todos os documentos antes' : 'Criar recebedor Pagar.me'}
                >
                  <CheckCircle2 size={13} className="mr-1" /> Aprovar e criar recebedor
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-border flex gap-4">
            {[
              { k: 'docs',     label: `Documentos (${kyc.documents.length})`, icon: FileText },
              { k: 'register', label: 'Dados cadastrais', icon: User },
              { k: 'bank',     label: 'Dados bancários',  icon: Banknote },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`flex items-center gap-1.5 text-sm py-2 border-b-2 -mb-px ${tab === t.k ? 'border-accent text-accent' : 'border-transparent text-text2'}`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'docs' && (
            <DocumentsPanel
              docs={kyc.documents}
              onApprove={id => approveDoc.mutate(id)}
              onAdjust={(id, type) => setAdjustDoc({ id, type })}
              onReject={(id, reason) => rejectDoc.mutate({ docId: id, reason })}
              isPending={approveDoc.isPending || rejectDoc.isPending}
            />
          )}
          {tab === 'register' && <RegisterPanel data={kyc.registerInformation} />}
          {tab === 'bank' && <BankPanel data={kyc.bankData} />}
        </div>
      )}

      {/* Modal pedir ajuste */}
      {adjustDoc && (
        <Modal open onClose={() => { setAdjustDoc(null); setAdjustReason(''); }} title={`Pedir ajuste em ${DOC_LABEL[adjustDoc.type] || adjustDoc.type}`}>
          <div className="space-y-3">
            <p className="text-sm text-text2">O produtor recebe uma notificação com o motivo e pode reenviar o arquivo.</p>
            <div className="form-group">
              <label className="label">Motivo do ajuste (mínimo 5 caracteres) *</label>
              <textarea
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                rows={3}
                className="input"
                placeholder="Ex: a foto do RG está desfocada, reenvie em melhor qualidade."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAdjustDoc(null)} className="btn-ghost btn-sm">Cancelar</button>
              <button
                onClick={() => requestAdjust.mutate({ docId: adjustDoc.id, reason: adjustReason })}
                disabled={adjustReason.length < 5 || requestAdjust.isPending}
                className="btn-primary btn-sm"
              >
                Enviar solicitação
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal revogar */}
      {showRevoke && (
        <Modal open onClose={() => { setShowRevoke(false); setRevokeReason(''); }} title="Cancelar aprovação do produtor">
          <div className="space-y-3">
            <p className="text-sm text-text2">
              A aprovação será revogada. O produtor volta para status "DOCUMENTS_SENT" e perde acesso às operações.
              O recebedor Pagar.me não é deletado — se preferir, também gerencie-o no painel do Pagar.me.
            </p>
            <div className="form-group">
              <label className="label">Motivo *</label>
              <textarea
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                rows={3}
                className="input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRevoke(false)} className="btn-ghost btn-sm">Voltar</button>
              <button
                onClick={() => revokeApproval.mutate(revokeReason)}
                disabled={revokeReason.length < 5 || revokeApproval.isPending}
                className="btn-danger btn-sm"
              >
                Confirmar revogação
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ── PAINEL DOCS ───────────────────────────────────────────────────
function DocumentsPanel({ docs, onApprove, onAdjust, onReject, isPending }: any) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!docs.length) return <div className="text-text3 text-sm py-6 text-center">Nenhum documento enviado.</div>;

  return (
    <div className="space-y-2">
      {docs.map((d: any) => (
        <div key={d.id} className="card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-text3 flex-shrink-0" />
                <span className="font-medium text-text">{DOC_LABEL[d.type] || d.type}</span>
                <DocStatusBadge status={d.status} />
              </div>
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                Abrir arquivo <ExternalLink size={10} />
              </a>
              <div className="text-xs text-text3 mt-0.5">Enviado em {new Date(d.uploadedAt).toLocaleString('pt-BR')}</div>
              {d.adjustmentReason && (
                <div className="text-xs text-yellow-400 mt-1">⚠ Ajuste pedido: {d.adjustmentReason}</div>
              )}
              {d.rejectionReason && (
                <div className="text-xs text-red-400 mt-1">✕ Rejeitado: {d.rejectionReason}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {d.status !== 'APPROVED' && (
                <button onClick={() => onApprove(d.id)} disabled={isPending} className="btn-success btn-sm" title="Aprovar">
                  <CheckCircle2 size={12} />
                </button>
              )}
              {d.status !== 'NEEDS_ADJUSTMENT' && (
                <button onClick={() => onAdjust(d.id, d.type)} disabled={isPending} className="btn-ghost btn-sm border border-yellow-500/50" title="Pedir ajuste">
                  <ClipboardCheck size={12} className="text-yellow-400" />
                </button>
              )}
              {d.status !== 'REJECTED' && (
                <button onClick={() => setRejectId(d.id)} disabled={isPending} className="btn-danger btn-sm" title="Rejeitar">
                  <XCircle size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {rejectId && (
        <Modal open onClose={() => { setRejectId(null); setRejectReason(''); }} title="Rejeitar documento">
          <div className="space-y-3">
            <div className="form-group">
              <label className="label">Motivo *</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="input" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectId(null)} className="btn-ghost btn-sm">Cancelar</button>
              <button
                onClick={() => { onReject(rejectId, rejectReason); setRejectId(null); setRejectReason(''); }}
                disabled={rejectReason.length < 5}
                className="btn-danger btn-sm"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING          : { label: 'aguardando', cls: 'text-text2 bg-bg3 border-border' },
    APPROVED         : { label: 'aprovado',   cls: 'text-green bg-green/10 border-green/40' },
    NEEDS_ADJUSTMENT : { label: 'ajustar',    cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40' },
    REJECTED         : { label: 'rejeitado',  cls: 'text-red-400 bg-red-500/10 border-red-500/40' },
  };
  const m = map[status] || map.PENDING;
  return <span className={`text-[10px] uppercase tracking-wide border px-1.5 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}

function RegisterPanel({ data }: { data: any }) {
  if (!data) return <div className="text-text3 text-sm py-6 text-center">Produtor ainda não preencheu dados cadastrais.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <Row label="Tipo" value={data.type === 'corporation' ? 'Pessoa Jurídica' : 'Pessoa Física'} />
      <Row label="Nome" value={data.name} />
      <Row label="Email" value={data.email} />
      <Row label="Documento" value={data.document} />
      {data.type === 'individual' ? (
        <>
          <Row label="Nascimento" value={data.birthdate} />
          <Row label="Profissão" value={data.professionalOccupation} />
          <Row label="Renda (cents)" value={data.monthlyIncome} />
          <Row label="Mãe" value={data.motherName} />
        </>
      ) : (
        <>
          <Row label="Razão social" value={data.companyName} />
          <Row label="Nome fantasia" value={data.tradingName} />
          <Row label="Tipo empresa" value={data.corporationType} />
          <Row label="Fundação" value={data.foundingDate} />
          <Row label="Faturamento anual (cents)" value={data.annualRevenue} />
          <Row label="Site" value={data.siteUrl} />
        </>
      )}
      {data.phoneNumbers?.[0] && (
        <Row label="Telefone" value={`(${data.phoneNumbers[0].ddd}) ${data.phoneNumbers[0].number}`} />
      )}
      {data.address && (
        <div className="md:col-span-2 border-t border-border pt-3 mt-2">
          <div className="font-semibold text-text mb-2">Endereço</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row label="CEP" value={data.address.zipCode} />
            <Row label="Logradouro" value={`${data.address.street}, ${data.address.streetNumber}`} />
            <Row label="Complemento" value={data.address.complementary || '—'} />
            <Row label="Bairro" value={data.address.neighborhood} />
            <Row label="Cidade/UF" value={`${data.address.city}/${data.address.state}`} />
          </div>
        </div>
      )}
    </div>
  );
}

function BankPanel({ data }: { data: any }) {
  if (!data) return <div className="text-text3 text-sm py-6 text-center">Produtor ainda não preencheu dados bancários.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <Row label="Banco" value={data.bank} />
      <Row label="Tipo" value={data.type === 'savings' ? 'Poupança' : 'Corrente'} />
      <Row label="Agência" value={`${data.branchNumber}${data.branchCheckDigit ? '-' + data.branchCheckDigit : ''}`} />
      <Row label="Conta" value={`${data.accountNumber}-${data.accountCheckDigit}`} />
      <Row label="Titular" value={data.holderName} />
      <Row label="Documento titular" value={data.holderDocument} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5">
      <span className="text-text3">{label}</span>
      <span className="font-medium text-text text-right">{value ?? '—'}</span>
    </div>
  );
}
