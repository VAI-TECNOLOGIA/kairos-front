import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { Handshake, CheckCircle, XCircle, Clock, Network } from 'lucide-react';

interface CoproducerRequest {
  id        : string;
  userId    : string;
  status    : 'PENDING' | 'APPROVED' | 'REJECTED';
  message   : string | null;
  createdAt : string;
  resolvedAt: string | null;
  user      : { id: string; name: string; email: string; phone: string | null };
}

interface CoproducerRecipient {
  recipientId  : string;
  name         : string;
  email        : string;
  count        : number;
  totalCents   : number;
  pendingCents : number;
}

export default function AdminCoproducers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'requests' | 'recipients'>('requests');

  const { data: requests, isLoading: reqLoading } = useQuery<CoproducerRequest[]>({
    queryKey: ['admin-coproducer-requests'],
    queryFn : () => api.get('/coproducer-requests').then(r => r.data),
  });

  const { data: recipients, isLoading: recLoading } = useQuery<CoproducerRecipient[]>({
    queryKey: ['admin-coproducers-recipients'],
    queryFn : () => api.get('/reports/coproducers').then(r => r.data),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/coproducer-requests/${id}/approve`),
    onSuccess: () => { toast.success('Solicitação aprovada'); qc.invalidateQueries({ queryKey: ['admin-coproducer-requests'] }); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/coproducer-requests/${id}/reject`),
    onSuccess: () => { toast.success('Solicitação rejeitada'); qc.invalidateQueries({ queryKey: ['admin-coproducer-requests'] }); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const reqList     = requests   || [];
  const recipList   = recipients || [];
  const pendingCount = reqList.filter(r => r.status === 'PENDING').length;
  const fmtBRL = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);

  return (
    <div>
      <PageHeader
        title="Co-produtores"
        sub="Aprovar afiliados que solicitaram virar produtor + ver quem recebe split COPRODUCER por oferta."
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          className={`btn-sm ${tab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('requests')}
        >
          <Clock size={13} />
          Solicitações de upgrade
          {pendingCount > 0 && (
            <span className="ml-1 bg-amber/20 text-amber text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
          )}
        </button>
        <button
          className={`btn-sm ${tab === 'recipients' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('recipients')}
        >
          <Handshake size={13} />
          Recebendo splits
        </button>
      </div>

      {tab === 'requests' && (
        <div className="card">
          {reqLoading ? (
            <p className="text-text3 text-sm py-8 text-center">Carregando...</p>
          ) : reqList.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <Clock size={32} className="text-text2" />
              <p className="text-text2">Nenhuma solicitação ainda.</p>
              <p className="text-text3 text-sm max-w-md">
                Quando um afiliado pedir pra virar produtor (botão "Solicitar virar Produtor" no painel dele),
                a solicitação aparece aqui pra ser aprovada.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Afiliado</th><th>E-mail</th><th>Status</th><th>Solicitado em</th><th>Resolvido em</th><th>Ação</th></tr></thead>
                <tbody>
                  {reqList.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium text-text">{r.user?.name || '—'}</td>
                      <td className="text-text2">{r.user?.email || '—'}</td>
                      <td>
                        {r.status === 'PENDING'  && <span className="badge-amber">Pendente</span>}
                        {r.status === 'APPROVED' && <span className="badge-green">Aprovado</span>}
                        {r.status === 'REJECTED' && <span className="badge-red">Rejeitado</span>}
                      </td>
                      <td className="text-text3 text-xs">{formatDateTime(r.createdAt)}</td>
                      <td className="text-text3 text-xs">{r.resolvedAt ? formatDateTime(r.resolvedAt) : '—'}</td>
                      <td>
                        {r.status === 'PENDING' ? (
                          <div className="flex gap-1.5">
                            <button onClick={() => approve.mutate(r.id)} disabled={approve.isPending} className="btn-ghost btn-sm text-green">
                              <CheckCircle size={12} /> Aprovar
                            </button>
                            <button onClick={() => reject.mutate(r.id)} disabled={reject.isPending} className="btn-ghost btn-sm text-red">
                              <XCircle size={12} /> Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className="text-text3 text-xs">—</span>
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

      {tab === 'recipients' && (
        <div className="card">
          {recLoading ? (
            <p className="text-text3 text-sm py-8 text-center">Carregando...</p>
          ) : recipList.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <Network size={32} className="text-text2" />
              <p className="text-text2">Ninguém recebendo split de coprodutor ainda.</p>
              <p className="text-text3 text-sm max-w-md">
                Quando um produtor configurar split COPRODUCER numa oferta (atribuindo email + %),
                ou quando um afiliado upline ganhar override de venda do downline,
                a lista aparece aqui com totais recebidos.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Nome</th><th>E-mail</th><th>Repasses</th><th>Total recebido</th><th>Pendente</th></tr>
                </thead>
                <tbody>
                  {recipList.map(c => (
                    <tr key={c.recipientId}>
                      <td className="font-medium text-text">{c.name}</td>
                      <td className="text-text2">{c.email}</td>
                      <td>{c.count}</td>
                      <td className="font-semibold text-text">{fmtBRL(c.totalCents)}</td>
                      <td>
                        <span className={c.pendingCents > 0 ? 'badge-amber' : 'badge-gray'}>
                          {fmtBRL(c.pendingCents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
