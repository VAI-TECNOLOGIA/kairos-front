import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { Handshake } from 'lucide-react';

export default function AdminCoproducers() {
  // Todos co-produtores via endpoint de relatórios
  const { data: coList, isLoading } = useQuery({
    queryKey: ['admin-coproducers'],
    queryFn : () => api.get('/reports/coproducers').then(r => r.data),
  });

  // Solicitações pendentes
  const { data: requests } = useQuery({
    queryKey: ['coproducer-requests-admin'],
    queryFn : () => api.get('/coproducers/requests').then(r => r.data),
  });

  const list     : any[] = coList    || [];
  const reqList  : any[] = requests  || [];
  const pending = reqList.filter((r: any) => r.status === 'PENDING');

  return (
    <div>
      <PageHeader title="Produtores" sub="Gestão de produção por produto" />

      {/* Solicitações pendentes */}
      {pending.length > 0 && (
        <div className="card mb-6">
          <div className="section-title mb-4 flex items-center gap-2">
            Solicitações pendentes
            <span className="badge-amber">{pending.length}</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Produto</th><th>Status</th><th>Data</th></tr></thead>
              <tbody>
                {pending.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-medium text-text">{r.product?.name || '—'}</td>
                    <td><span className="badge-amber">{r.status}</span></td>
                    <td className="text-text3">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Todos co-produtores */}
      {isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState
          icon={<Handshake size={32} />}
          title="Produtores"
          sub="Gerencie produtores e seus splits por oferta."
        />
      ) : (
        <div className="card">
          <div className="section-title mb-4">Produtores ativos</div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Repasses</th><th>Total recebido</th><th>Pendente</th></tr>
              </thead>
              <tbody>
                {list.map((c: any) => (
                  <tr key={c.recipientId}>
                    <td className="font-medium text-text">{c.name}</td>
                    <td className="text-text2">{c.email}</td>
                    <td>{c.count}</td>
                    <td className="font-semibold text-text">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.totalCents / 100)}
                    </td>
                    <td>
                      <span className={c.pendingCents > 0 ? 'badge-amber' : 'badge-gray'}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.pendingCents / 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}