import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Users, Search, X, Zap, FileText, CreditCard, Clock, Info } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════

const RELEASE_METHODS = ['PIX', 'BOLETO', 'CARD'] as const;
type ReleaseMethod = typeof RELEASE_METHODS[number];

type DaysMap = Record<ReleaseMethod, number>;

const METHOD_META: Record<ReleaseMethod, { label: string; icon: any; color: string; defaultDays: number }> = {
  PIX   : { label: 'Pix',    icon: Zap,        color: '#00C9A7', defaultDays: 1  },
  BOLETO: { label: 'Boleto', icon: FileText,   color: '#F59E0B', defaultDays: 2  },
  CARD  : { label: 'Cartão', icon: CreditCard, color: '#0055FE', defaultDays: 15 },
};

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function AdminReleaseDays() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ days: DaysMap }>({
    queryKey: ['admin-release-days'],
    queryFn : () => api.get('/admin/release-days').then(r => r.data),
  });

  const [draft, setDraft] = useState<Partial<Record<ReleaseMethod, string>>>({});

  useEffect(() => {
    if (!data?.days) return;
    setDraft({
      PIX   : String(data.days.PIX    ?? 1),
      BOLETO: String(data.days.BOLETO ?? 2),
      CARD  : String(data.days.CARD   ?? 15),
    });
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const days: any = {};
      for (const m of RELEASE_METHODS) {
        const v = parseInt(draft[m] || '0', 10);
        if (!isNaN(v) && v >= 0) days[m] = v;
      }
      return api.post('/admin/release-days', { days });
    },
    onSuccess: () => { toast.success('Prazos atualizados!'); qc.invalidateQueries({ queryKey: ['admin-release-days'] }); },
    onError  : () => toast.error('Erro ao salvar'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prazos de Liberação"
        sub="Quanto tempo após a aprovação da venda o valor fica disponível para saque."
      />

      <div className="card bg-accent/5 border-accent/20">
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs text-text2 leading-relaxed">
            <strong className="text-text">Hierarquia:</strong> Pagar.me → Plataforma → Produtor/Afiliado.
            O valor só pode ser sacado após o prazo do método de pagamento usado na venda.
            Conforme a plataforma ganhar volume e vantagens com a Pagar.me, esses prazos podem ser reduzidos.
          </div>
        </div>
      </div>

      {/* Bloco 1 — Prazos padrão */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <Clock size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Prazos Padrão da Plataforma</h3>
            <p className="text-xs text-text3 mt-0.5">Aplicados quando o usuário não tem prazo personalizado.</p>
          </div>
        </div>

        {isLoading ? <div className="h-40 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-40">Método</th>
                  <th className="w-60">Prazo (dias)</th>
                  <th>Padrão recomendado</th>
                </tr>
              </thead>
              <tbody>
                {RELEASE_METHODS.map(m => {
                  const meta = METHOD_META[m];
                  const Icon = meta.icon;
                  return (
                    <tr key={m}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: meta.color }} />
                          <span className="font-medium text-text">{meta.label}</span>
                        </div>
                      </td>
                      <td>
                        <div className="relative w-40">
                          <input
                            type="number"
                            min={0}
                            max={180}
                            value={draft[m] ?? ''}
                            onChange={(e) => setDraft(prev => ({ ...prev, [m]: e.target.value }))}
                            className="input h-9 pr-14"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-xs">dias</span>
                        </div>
                      </td>
                      <td className="text-text3 text-xs">{meta.defaultDays} dias</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || isLoading}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Save size={13} />
            {save.isPending ? 'Salvando...' : 'Salvar prazos'}
          </button>
        </div>
      </div>

      {/* Bloco 2 — Prazos personalizados por usuário */}
      <CustomReleaseDaysSection defaultDays={data?.days ?? null} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PRAZOS PERSONALIZADOS POR USUÁRIO
// ══════════════════════════════════════════════════════════════════

interface CustomReleaseRow {
  userId           : string;
  name             : string;
  email            : string;
  role             : 'PRODUCER' | 'AFFILIATE';
  customReleaseDays: Partial<Record<ReleaseMethod, number>> | null;
}

function CustomReleaseDaysSection({ defaultDays }: { defaultDays: DaysMap | null }) {
  const qc = useQueryClient();
  const [query, setQuery]           = useState('');
  const [onlyCustom, setOnlyCustom] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PRODUCER' | 'AFFILIATE'>('ALL');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data: usersData } = useQuery<{ data: CustomReleaseRow[] }>({
    queryKey: ['admin-release-users', query, onlyCustom, roleFilter],
    queryFn : () => api.get('/admin/release-days/users', {
      params: {
        q         : query,
        onlyCustom: onlyCustom ? '1' : '0',
        role      : roleFilter === 'ALL' ? undefined : roleFilter,
      },
    }).then(r => r.data),
  });

  const saveUser = useMutation({
    mutationFn: (vars: { userId: string; customReleaseDays: Record<ReleaseMethod, number> | null }) =>
      api.put(`/admin/release-days/users/${vars.userId}`, { customReleaseDays: vars.customReleaseDays }),
    onSuccess: () => {
      toast.success('Prazo personalizado salvo');
      qc.invalidateQueries({ queryKey: ['admin-release-users'] });
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2.5">
        <Users size={16} className="text-accent flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-text">Prazos Personalizados por Usuário</h3>
          <p className="text-xs text-text3 mt-0.5">Vantagem de liberação em menos dias para produtores/afiliados específicos. Campo vazio herda o padrão.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="input pl-9 h-9"
          />
        </div>

        <div className="inline-flex rounded-[7px] border border-border bg-bg overflow-hidden text-xs">
          {([
            { id: 'ALL',       label: 'Todos'     },
            { id: 'PRODUCER',  label: 'Produtor'  },
            { id: 'AFFILIATE', label: 'Afiliado'  },
          ] as const).map((r, i) => {
            const active = roleFilter === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  active ? 'bg-accent text-white' : 'text-text3 hover:text-text2'
                } ${i > 0 ? 'border-l border-border' : ''}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyCustom}
            onChange={(e) => setOnlyCustom(e.target.checked)}
            className="w-4 h-4"
          />
          Apenas com prazo personalizado
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Tipo</th>
              <th>Resumo</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody>
            {(usersData?.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-text3 py-6">
                  {onlyCustom ? 'Nenhum usuário com prazo personalizado' : 'Nenhum usuário encontrado'}
                </td>
              </tr>
            ) : (
              (usersData?.data ?? []).map(u => (
                <CustomReleaseUserRow
                  key={`${u.role}:${u.userId}`}
                  row={u}
                  defaultDays={defaultDays}
                  expanded={expandedUserId === u.userId}
                  onToggle={() => setExpandedUserId(prev => prev === u.userId ? null : u.userId)}
                  onSave={(cd) => saveUser.mutate({ userId: u.userId, customReleaseDays: cd })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomReleaseUserRow({ row, defaultDays, expanded, onToggle, onSave }: {
  row        : CustomReleaseRow;
  defaultDays: DaysMap | null;
  expanded   : boolean;
  onToggle   : () => void;
  onSave     : (cd: Record<ReleaseMethod, number> | null) => void;
}) {
  const [draft, setDraft] = useState<Partial<Record<ReleaseMethod, string>>>({});

  useEffect(() => {
    const init: Partial<Record<ReleaseMethod, string>> = {};
    for (const m of RELEASE_METHODS) {
      init[m] = row.customReleaseDays?.[m] !== undefined ? String(row.customReleaseDays![m]) : '';
    }
    setDraft(init);
  }, [row.customReleaseDays]);

  const hasAny = useMemo(() => {
    return RELEASE_METHODS.some(m => row.customReleaseDays?.[m] !== undefined);
  }, [row.customReleaseDays]);

  const summary = useMemo(() => {
    if (!hasAny) return <span className="text-text3 text-xs">Usa prazo padrão</span>;
    const parts = RELEASE_METHODS
      .filter(m => row.customReleaseDays?.[m] !== undefined)
      .map(m => `${METHOD_META[m].label}: ${row.customReleaseDays![m]}d`);
    return <span className="text-text2 text-xs">{parts.join(' · ')}</span>;
  }, [row.customReleaseDays, hasAny]);

  const parseDraft = (): Record<ReleaseMethod, number> | null => {
    const out: any = {};
    for (const m of RELEASE_METHODS) {
      const raw = (draft[m] ?? '').trim();
      if (!raw) continue;
      const v = parseInt(raw, 10);
      if (!isNaN(v) && v >= 0) out[m] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  };

  return (
    <>
      <tr>
        <td>
          <div className="text-text font-medium">{row.name}</div>
          <div className="text-text3 text-xs">{row.email}</div>
        </td>
        <td>
          <span className={row.role === 'PRODUCER' ? 'badge-blue' : 'badge-gray'}>
            {row.role === 'PRODUCER' ? 'Produtor' : 'Afiliado'}
          </span>
        </td>
        <td>{summary}</td>
        <td>
          <div className="flex gap-2 justify-end">
            <button onClick={onToggle} className="btn-sec btn-sm">
              {expanded ? 'Fechar' : 'Editar'}
            </button>
            {hasAny && (
              <button
                onClick={() => {
                  if (confirm('Remover prazos personalizados deste usuário?')) onSave(null);
                }}
                title="Resetar para prazo padrão"
                className="btn-ghost btn-sm text-text3 hover:text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} className="bg-bg3/40 !pt-4 !pb-5">
            <div className="space-y-3">
              <p className="text-[11px] text-text3">
                Preencha apenas os métodos que precisam de prazo diferente. Campos vazios herdam o padrão.
              </p>
              <table className="table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th className="w-28">Método</th>
                    <th className="w-32">Padrão</th>
                    <th>Prazo personalizado (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {RELEASE_METHODS.map(m => {
                    const meta = METHOD_META[m];
                    const Icon = meta.icon;
                    const def  = defaultDays?.[m] ?? meta.defaultDays;
                    return (
                      <tr key={m}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: meta.color }} />
                            <span className="font-medium text-text">{meta.label}</span>
                          </div>
                        </td>
                        <td className="text-text3 text-xs">{def} dias</td>
                        <td className="w-40">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={180}
                              value={draft[m] ?? ''}
                              onChange={(e) => setDraft(prev => ({ ...prev, [m]: e.target.value }))}
                              placeholder="Padrão"
                              className="input h-8 pr-14"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-xs">dias</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => onSave(parseDraft())}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Save size={13} /> Salvar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
