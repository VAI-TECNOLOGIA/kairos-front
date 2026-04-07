import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { Handshake } from 'lucide-react';

export default function MyCoproducers() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-coproducers'],
    queryFn : () => api.get('/reports/my-coproducers').then(r => r.data),
  });

  const list: any[] = data || [];

  return (
    <div>
      <PageHeader title="Co-Produtores" sub="Gerencie parceiros nos seus produtos" />

      {isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState
          icon={<Handshake size={32} />}
          title="Nenhum co-produtor"
          sub="Co-produtores vinculados aos seus produtos aparecerão aqui."
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
      )}
    </div>
  );
}