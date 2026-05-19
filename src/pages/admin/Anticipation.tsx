import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PageHeader, Loading, EmptyState, StatCard } from '@/components/ui';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Zap, Search, CheckCircle2, XCircle } from 'lucide-react';

interface ProducerRow {
  producerId      : string;
  userId          : string;
  name            : string | null;
  email           : string | null;
  recipientId     : string | null;
  recipientStatus : string | null;
  enabled         : boolean;
  type            : string | null;
  volumePercentage: number;
  delay           : number;
  updatedAt       : string | null;
}

interface Overview {
  total    : number;
  enabled  : number;
  disabled : number;
  producers: ProducerRow[];
}

export default function AdminAnticipation() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<Overview>({
    queryKey: ['admin-anticipation'],
    queryFn : () => api.get('/admin/anticipation/overview').then(r => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      api.patch(`/admin/producers/by-user/${userId}/anticipation`, {
        enabled,
        type            : 'full',
        volumePercentage: 100,
        delay           : 0,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-anticipation'] });
      toast.success(vars.enabled ? 'Antecipação ativada' : 'Antecipação desativada');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao atualizar'),
  });

  const filtered = (data?.producers || []).filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(s) || (p.email || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <PageHeader
        title="Antecipação automática"
        sub="Ativação por produtor — espelhada na Pagar.me em tempo real"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Zap size={18} />}          label="Producers com recipient" value={String(data?.total ?? 0)} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Antecipação ativa"        value={String(data?.enabled ?? 0)} />
        <StatCard icon={<XCircle size={18} />}      label="Desativada"               value={String(data?.disabled ?? 0)} />
      </div>

      <div className="card mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum produtor" sub="Cadastre producers com recipient pra habilitar antecipação" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text3 border-b border-border">
                  <th className="py-2">Produtor</th>
                  <th className="py-2">Recipient</th>
                  <th className="py-2">Antecipação</th>
                  <th className="py-2">Config</th>
                  <th className="py-2">Atualizado</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.producerId} className="border-b border-border/50 last:border-0">
                    <td className="py-2">
                      <div className="font-medium text-text">{p.name || '—'}</div>
                      <div className="text-[10px] text-text3">{p.email || '—'}</div>
                    </td>
                    <td className="py-2">
                      <span className={p.recipientStatus === 'active' ? 'badge-green' : 'badge-amber'}>
                        {p.recipientStatus || '—'}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={p.enabled ? 'badge-green' : 'badge-amber'}>
                        {p.enabled ? 'Ativada' : 'Desativada'}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-text2">
                      {p.enabled ? (
                        <>type={p.type} · vol={p.volumePercentage}% · delay={p.delay}d</>
                      ) : (
                        <span className="text-text3">—</span>
                      )}
                    </td>
                    <td className="py-2 text-[10px] text-text3">
                      {p.updatedAt ? formatDateTime(p.updatedAt) : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        className={`btn-sm ${p.enabled ? 'btn-ghost' : 'btn-primary'}`}
                        disabled={p.recipientStatus !== 'active' || toggle.isPending}
                        onClick={() => toggle.mutate({ userId: p.userId, enabled: !p.enabled })}
                      >
                        {p.enabled ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
