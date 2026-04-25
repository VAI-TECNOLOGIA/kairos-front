import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { Wallet, Search } from 'lucide-react';

interface Row {
  producerId    : string;
  userId        : string;
  name          : string;
  email         : string;
  availableCents: number;
  pendingCents  : number;
  retainedCents : number;
}

export default function AdminBalances() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'available' | 'pending' | 'name'>('available');

  const { data: rows, isLoading } = useQuery<Row[]>({
    queryKey: ['admin-balances', search, sortBy],
    queryFn : () => api.get('/admin/balances', { params: { search: search || undefined, sortBy } }).then(r => r.data),
  });

  const totals = (rows || []).reduce((acc, r) => ({
    available: acc.available + r.availableCents,
    pending  : acc.pending   + r.pendingCents,
    retained : acc.retained  + r.retainedCents,
  }), { available: 0, pending: 0, retained: 0 });

  return (
    <div>
      <PageHeader
        title="Saldo Global"
        sub="Visualize os saldos dos produtores"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="card p-3">
          <div className="text-xs text-text3">Total Disponível</div>
          <div className="text-xl font-bold text-green">{formatBRL(totals.available)}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-text3">Total Pendente</div>
          <div className="text-xl font-bold text-amber">{formatBRL(totals.pending)}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-text3">Total Retido</div>
          <div className="text-xl font-bold text-text">{formatBRL(totals.retained)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou email"
            className="input pl-9 w-full"
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input sm:w-56">
          <option value="available">Ordenar: Disponível (maior)</option>
          <option value="pending">Ordenar: Pendente (maior)</option>
          <option value="name">Ordenar: Nome (A-Z)</option>
        </select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon={<Wallet size={32} />} title="Sem produtores" sub="Nenhum produtor encontrado." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Produtor</th>
                <th className="text-right">Valor Disponível</th>
                <th className="text-right">Valor Pendente</th>
                <th className="text-right">Valor Retido</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.producerId}>
                  <td>
                    <div className="font-medium text-text">{r.name || '—'}</div>
                    <div className="text-xs text-text3">{r.email}</div>
                  </td>
                  <td className="text-right font-medium text-green whitespace-nowrap">{r.availableCents > 0 ? formatBRL(r.availableCents) : '—'}</td>
                  <td className="text-right text-amber whitespace-nowrap">{r.pendingCents > 0 ? formatBRL(r.pendingCents) : '—'}</td>
                  <td className="text-right text-text whitespace-nowrap">{r.retainedCents > 0 ? formatBRL(r.retainedCents) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
