import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Loading, EmptyState, DateCell } from '@/components/ui';
import api from '@/lib/api';
import { productStatusVariant } from '@/lib/utils';
import { AlertTriangle, Search, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Row {
  id        : string;
  name      : string;
  imageUrl  : string | null;
  category  : string | null;
  status    : string;
  riskScore : number;
  producer  : { name: string; email: string; avatarUrl: string | null };
  updatedAt : string;
  createdAt : string;
}

export default function AdminRiskProducts() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<{ rows: Row[]; maxScore: number }>({
    queryKey: ['admin-risk-products', search],
    queryFn : () => api.get('/admin/risk-products', { params: { search: search || undefined } }).then(r => r.data),
  });

  const rows = data?.rows || [];
  const max  = data?.maxScore || 28;

  const scoreColor = (score: number) =>
    score >= max * 0.7 ? 'bg-red text-white' :
    score >= max * 0.4 ? 'bg-amber text-white' :
    'bg-green text-white';

  return (
    <div>
      <PageHeader
        title="Risco de Produtos"
        sub="Visão geral pra analisar produtos cadastrados e o quanto são arriscados pra sua operação"
      />

      <div className="card p-3 mb-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto" className="input pl-9 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-red/10 border-l-2 border-red p-2 rounded text-red">O valor máximo de risco é {max}</div>
        <div className="bg-accent/10 border-l-2 border-accent p-2 rounded text-accent">Produtos de produtores banidos não aparecem na lista</div>
      </div>

      {isLoading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={32} />} title="Sem produtos" sub="Nenhum produto a analisar." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Produtor</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Risco</th>
                <th>Última atualização</th>
                <th>Data de cadastro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded bg-bg3 flex-shrink-0 overflow-hidden">
                        {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-text3" /></div>}
                      </div>
                      <span className="text-sm text-text truncate">{r.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-text">{r.producer.name}</div>
                    <div className="text-xs text-text3">{r.producer.email}</div>
                  </td>
                  <td className="text-xs text-text2">{r.category || '—'}</td>
                  <td><span className={productStatusVariant(r.status)}>{r.status}</span></td>
                  <td>
                    <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold', scoreColor(r.riskScore))}>
                      {r.riskScore}
                    </span>
                  </td>
                  <td><DateCell date={r.updatedAt} /></td>
                  <td><DateCell date={r.createdAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
