import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { Handshake, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyCoproducers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'coproducers' | 'requests'>('coproducers');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const { register: regReject, handleSubmit: handleReject, reset: resetReject } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['my-coproducers'],
    queryFn : () => api.get('/reports/my-coproducers').then(r => r.data),
  });

  const { data: requests, isLoading: loadingReqs } = useQuery({
    queryKey: ['coproducer-requests'],
    queryFn : () => api.get('/coproducer-requests').then(r => r.data),
    enabled : tab === 'requests',
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/coproducer-requests/${id}/approve`),
    onSuccess: () => {
      toast.success('Produtor aprovado!');
      qc.invalidateQueries({ queryKey: ['coproducer-requests'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/coproducer-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Solicitação recusada.');
      qc.invalidateQueries({ queryKey: ['coproducer-requests'] });
      setRejectId(null);
      resetReject();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const list: any[]     = data           || [];
  const reqList: any[]  = requests        || [];
  const pendingCount    = reqList.filter((r: any) => r.status === 'PENDING').length;

  return (
    <div>
      <PageHeader title="Produtores" sub="Gerencie parceiros nos seus produtos" />

      <div className="flex gap-2 mb-6">
        <button
          className={`btn-sm ${tab === 'coproducers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('coproducers')}
        >
          <Handshake size={13} />
          Produtores
        </button>
        <button
          className={`btn-sm ${tab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('requests')}
        >
          <Clock size={13} />
          Solicitações
          {pendingCount > 0 && (
            <span className="ml-1 bg-danger text-white text-xs rounded-full px-1.5 py-0.5">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ABA CO-PRODUTORES */}
      {tab === 'coproducers' && (
        isLoading ? <Loading /> : list.length === 0 ? (
          <EmptyState
            icon={<Handshake size={32} />}
            title="Nenhum produtor"
            sub="Produtores vinculados aos seus produtos aparecerão aqui."
          />
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Nome</th><th>E-mail</th><th>Produto</th><th>Desde</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {list.map((c: any) => (
                    <tr key={c.id}>
                      <td className="font-medium text-text">{c.coproducer?.user?.name || '—'}</td>
                      <td className="text-text2">{c.coproducer?.user?.email || '—'}</td>
                      <td className="text-text2">{c.product?.name || '—'}</td>
                      <td className="text-text3">{formatDate(c.authorizedAt)}</td>
                      <td>
                        <span className={c.isActive ? 'badge-green' : 'badge-gray'}>
                          {c.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ABA SOLICITAÇÕES */}
      {tab === 'requests' && (
        loadingReqs ? <Loading /> : reqList.length === 0 ? (
          <EmptyState
            icon={<Clock size={32} />}
            title="Nenhuma solicitação"
            sub="Afiliados que solicitarem ser produtores aparecerão aqui."
          />
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Nome</th><th>E-mail</th><th>Solicitado em</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {reqList.map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-medium text-text">{r.user?.name || '—'}</td>
                      <td className="text-text2">{r.user?.email || '—'}</td>
                      <td className="text-text3">{formatDate(r.createdAt)}</td>
                      <td>
                        <span className={
                          r.status === 'APPROVED' ? 'badge-green' :
                          r.status === 'REJECTED' ? 'badge-red'   : 'badge-amber'
                        }>
                          {r.status === 'APPROVED' ? 'Aprovado' :
                           r.status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                        </span>
                      </td>
                      <td>
                        {r.status === 'PENDING' && (
                          rejectId === r.id ? (
                            <form
                              onSubmit={handleReject(d => reject.mutate({ id: r.id, reason: d.reason }))}
                              className="flex gap-2 items-center"
                            >
                              <input
                                className="input text-xs py-1 h-7"
                                placeholder="Motivo (opcional)"
                                {...regReject('reason')}
                              />
                              <button type="submit" className="btn-danger btn-sm">Confirmar</button>
                              <button type="button" className="btn-secondary btn-sm" onClick={() => setRejectId(null)}>Cancelar</button>
                            </form>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                className="btn-success btn-sm"
                                onClick={() => approve.mutate(r.id)}
                                disabled={approve.isPending}
                              >
                                <CheckCircle size={12} /> Aprovar
                              </button>
                              <button
                                className="btn-danger btn-sm"
                                onClick={() => setRejectId(r.id)}
                              >
                                <XCircle size={12} /> Recusar
                              </button>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}