import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Users, Search, X, Zap, FileText, CreditCard, ArrowUpRight, Percent as PercentIcon, TrendingUp, Building2, Info } from 'lucide-react';
import pagarmeLogo from '@/assets/pagarme.png';

// ══════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════

const FEE_METHODS = ['PIX', 'BOLETO', 'CARD', 'WITHDRAWAL'] as const;
type FeeMethod = typeof FEE_METHODS[number];

interface FeePart {
  bps?  : number;
  cents?: number;
}

interface FeeConfig {
  platform: FeePart;
  acquirer: FeePart;
}

type FeesMap = Record<FeeMethod, FeeConfig>;

const METHOD_META: Record<FeeMethod, { label: string; icon: any; color: string }> = {
  PIX       : { label: 'Pix',        icon: Zap,          color: '#00C9A7' },
  BOLETO    : { label: 'Boleto',     icon: FileText,     color: '#F59E0B' },
  CARD      : { label: 'Cartão',     icon: CreditCard,   color: '#0055FE' },
  WITHDRAWAL: { label: 'Saque',      icon: ArrowUpRight, color: '#7C3AED' },
};

const EMPTY_CONFIG: FeeConfig = { platform: {}, acquirer: {} };

// ══════════════════════════════════════════════════════════════════
// HELPERS DE FORMATAÇÃO
// ══════════════════════════════════════════════════════════════════

function bpsToPct(bps?: number): string  { return bps ? (bps / 100).toFixed(2) : ''; }
function centsToBRL(cents?: number): string { return cents ? (cents / 100).toFixed(2) : ''; }

function pctToBps(pct: string): number | undefined {
  if (!pct.trim()) return undefined;
  const n = parseFloat(pct.replace(',', '.'));
  if (isNaN(n) || n <= 0) return undefined;
  return Math.round(n * 100);
}
function brlToCents(reais: string): number | undefined {
  if (!reais.trim()) return undefined;
  const n = parseFloat(reais.replace(',', '.'));
  if (isNaN(n) || n <= 0) return undefined;
  return Math.round(n * 100);
}

function partToCents(p: FeePart, saleCents: number): number {
  const pct = p.bps ? Math.round(saleCents * p.bps / 10000) : 0;
  return pct + (p.cents ?? 0);
}

function formatPart(p: FeePart): string {
  const parts: string[] = [];
  if (p.bps)   parts.push(`${(p.bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`);
  if (p.cents) parts.push(`R$ ${(p.cents / 100).toFixed(2).replace('.', ',')}`);
  return parts.join(' + ') || '—';
}

function formatBRL(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs  = Math.abs(cents);
  return `${sign}R$ ${(abs / 100).toFixed(2).replace('.', ',')}`;
}

// ══════════════════════════════════════════════════════════════════
// INPUT COMBINADO: bps + cents (ambos opcionais)
// ══════════════════════════════════════════════════════════════════

function FeePartInputs({ part, onChange, compact }: {
  part    : FeePart;
  onChange: (p: FeePart) => void;
  compact?: boolean;
}) {
  const [pct,  setPct]  = useState(bpsToPct(part.bps));
  const [reais, setReais] = useState(centsToBRL(part.cents));

  useEffect(() => { setPct(bpsToPct(part.bps)); }, [part.bps]);
  useEffect(() => { setReais(centsToBRL(part.cents)); }, [part.cents]);

  const commitPct = (v: string) => {
    setPct(v);
    onChange({ ...part, bps: pctToBps(v) });
  };
  const commitBrl = (v: string) => {
    setReais(v);
    onChange({ ...part, cents: brlToCents(v) });
  };

  const h = compact ? 'h-8' : 'h-9';

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="relative flex-1 min-w-0">
        <input
          type="text"
          inputMode="decimal"
          value={pct}
          onChange={(e) => commitPct(e.target.value)}
          placeholder="0,00"
          className={`input ${h} pr-7 w-full`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 text-[10px]">%</span>
      </div>
      <span className="text-text3 text-xs">+</span>
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3 text-[10px]">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={reais}
          onChange={(e) => commitBrl(e.target.value)}
          placeholder="0,00"
          className={`input ${h} pl-7 w-full`}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function AdminFees() {
  const qc = useQueryClient();

  const { data: feesData, isLoading } = useQuery<{ fees: FeesMap }>({
    queryKey: ['admin-fees'],
    queryFn : () => api.get('/admin/fees').then(r => r.data),
  });

  const [fees, setFees] = useState<FeesMap | null>(null);

  useEffect(() => {
    if (feesData?.fees) setFees(feesData.fees);
  }, [feesData]);

  const saveAll = useMutation({
    mutationFn: () => {
      if (!fees) return Promise.reject(new Error('Sem dados'));
      return api.post('/admin/fees', { fees });
    },
    onSuccess: () => { toast.success('Taxas salvas!'); qc.invalidateQueries({ queryKey: ['admin-fees'] }); },
    onError  : () => toast.error('Erro ao salvar'),
  });

  const setMethodConfig = (m: FeeMethod, section: 'platform' | 'acquirer', part: FeePart) => {
    setFees(prev => prev
      ? { ...prev, [m]: { ...prev[m], [section]: part } }
      : prev
    );
  };

  // Simulação de margem (exemplo R$100)
  const SAMPLE_SALE = 10000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxas e Comissões"
        sub="Configure a taxa da plataforma e a taxa do adquirente. O que o usuário paga é a taxa da plataforma; o lucro é a diferença."
      />

      <div className="card bg-accent/5 border-accent/20">
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs text-text2 leading-relaxed">
            <strong className="text-text">Cada taxa aceita % e R$ fixo juntos.</strong> Ex: Boleto 3,80% + R$ 3,00. Campos vazios são ignorados.
            A taxa aplicada a cada venda é <strong className="text-text">fotografada no momento da transação</strong> — alterações futuras só valem para novas vendas.
          </div>
        </div>
      </div>

      {/* Bloco 1 — Taxa geral da plataforma */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <PercentIcon size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Taxa Geral da Plataforma</h3>
            <p className="text-xs text-text3 mt-0.5">Taxa cobrada do produtor/afiliado quando não há taxa personalizada.</p>
          </div>
        </div>

        {isLoading || !fees ? <div className="h-48 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-28">Método</th>
                  <th>Taxa plataforma (% + R$)</th>
                </tr>
              </thead>
              <tbody>
                {FEE_METHODS.map(m => {
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
                      <td className="w-80">
                        <FeePartInputs
                          part={fees[m]?.platform ?? {}}
                          onChange={(p) => setMethodConfig(m, 'platform', p)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bloco 2 — Taxa do adquirente */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Building2 size={16} className="text-accent flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-text">Taxa do Adquirente</h3>
            <p className="text-xs text-text3 mt-0.5">Custo interno da plataforma. Não é exibida ao produtor. Usada apenas para cálculo de margem.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: '#08ac541f', color: '#08ac54', borderColor: '#08ac5440' }}>
              Pagar.me
            </span>
            <img src={pagarmeLogo} alt="Pagar.me" className="h-5 object-contain opacity-90" />
          </div>
        </div>

        {isLoading || !fees ? <div className="h-48 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-28">Método</th>
                  <th>Custo do adquirente (% + R$)</th>
                </tr>
              </thead>
              <tbody>
                {FEE_METHODS.map(m => {
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
                      <td className="w-80">
                        <FeePartInputs
                          part={fees[m]?.acquirer ?? {}}
                          onChange={(p) => setMethodConfig(m, 'acquirer', p)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={() => saveAll.mutate()}
            disabled={saveAll.isPending || isLoading}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Save size={13} />
            {saveAll.isPending ? 'Salvando...' : 'Salvar todas as taxas'}
          </button>
        </div>
      </div>

      {/* Bloco 3 — Simulação de margem */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Simulação de Margem</h3>
            <p className="text-xs text-text3 mt-0.5">Lucro da plataforma em uma venda de <strong className="text-text">R$ 100,00</strong>.</p>
          </div>
        </div>

        {isLoading || !fees ? <div className="h-40 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Taxa plataforma</th>
                  <th>Taxa adquirente</th>
                  <th>Margem da plataforma</th>
                </tr>
              </thead>
              <tbody>
                {FEE_METHODS.map(m => {
                  const cfg  = fees[m] ?? EMPTY_CONFIG;
                  const pc   = partToCents(cfg.platform, SAMPLE_SALE);
                  const ac   = partToCents(cfg.acquirer, SAMPLE_SALE);
                  const diff = pc - ac;
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
                      <td className="text-text2 text-sm">{formatPart(cfg.platform)}</td>
                      <td className="text-text3 text-sm">{formatPart(cfg.acquirer)}</td>
                      <td>
                        <span className={`font-semibold ${diff < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {diff >= 0 ? '+' : ''}{formatBRL(diff)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bloco 4 — Taxas personalizadas por usuário */}
      <CustomFeesSection />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAXAS PERSONALIZADAS POR USUÁRIO
// ══════════════════════════════════════════════════════════════════

interface CustomFeeRowData {
  userId    : string;
  name      : string;
  email     : string;
  role      : 'PRODUCER' | 'AFFILIATE';
  customFees: Partial<Record<FeeMethod, FeePart>> | null;
}

function CustomFeesSection() {
  const qc = useQueryClient();
  const [query, setQuery]           = useState('');
  const [onlyCustom, setOnlyCustom] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PRODUCER' | 'AFFILIATE'>('ALL');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data: feesData } = useQuery<{ fees: FeesMap }>({
    queryKey: ['admin-fees'],
    queryFn : () => api.get('/admin/fees').then(r => r.data),
  });

  const { data: usersData } = useQuery<{ data: CustomFeeRowData[] }>({
    queryKey: ['admin-fees-users', query, onlyCustom, roleFilter],
    queryFn : () => api.get('/admin/fees/users', {
      params: {
        q         : query,
        onlyCustom: onlyCustom ? '1' : '0',
        role      : roleFilter === 'ALL' ? undefined : roleFilter,
      },
    }).then(r => r.data),
  });

  const saveUserFee = useMutation({
    mutationFn: (vars: { userId: string; customFees: Record<FeeMethod, FeePart> | null }) =>
      api.put(`/admin/fees/users/${vars.userId}`, { customFees: vars.customFees }),
    onSuccess: () => {
      toast.success('Taxa personalizada salva');
      qc.invalidateQueries({ queryKey: ['admin-fees-users'] });
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2.5">
        <Users size={16} className="text-accent flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-text">Taxas Personalizadas por Usuário</h3>
          <p className="text-xs text-text3 mt-0.5">Por método. Campos vazios herdam a taxa geral.</p>
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
          Apenas com taxa personalizada
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
                  {onlyCustom ? 'Nenhum usuário com taxa personalizada' : 'Nenhum usuário encontrado'}
                </td>
              </tr>
            ) : (
              (usersData?.data ?? []).map(u => (
                <CustomFeeUserRow
                  key={`${u.role}:${u.userId}`}
                  row={u}
                  generalFees={feesData?.fees ?? null}
                  expanded={expandedUserId === u.userId}
                  onToggle={() => setExpandedUserId(prev => prev === u.userId ? null : u.userId)}
                  onSave={(cf) => saveUserFee.mutate({ userId: u.userId, customFees: cf })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomFeeUserRow({ row, generalFees, expanded, onToggle, onSave }: {
  row        : CustomFeeRowData;
  generalFees: FeesMap | null;
  expanded   : boolean;
  onToggle   : () => void;
  onSave     : (cf: Record<FeeMethod, FeePart> | null) => void;
}) {
  const [draft, setDraft] = useState<Record<FeeMethod, FeePart>>({} as any);

  useEffect(() => {
    const init: Record<FeeMethod, FeePart> = {} as any;
    for (const m of FEE_METHODS) init[m] = row.customFees?.[m] ?? {};
    setDraft(init);
  }, [row.customFees]);

  const hasAny = useMemo(() => {
    return FEE_METHODS.some(m => row.customFees?.[m]?.bps || row.customFees?.[m]?.cents);
  }, [row.customFees]);

  const summary = useMemo(() => {
    if (!hasAny) return <span className="text-text3 text-xs">Usa taxa geral</span>;
    const parts = FEE_METHODS
      .filter(m => row.customFees?.[m]?.bps || row.customFees?.[m]?.cents)
      .map(m => `${METHOD_META[m].label}: ${formatPart(row.customFees![m]!)}`);
    return <span className="text-text2 text-xs">{parts.join(' · ')}</span>;
  }, [row.customFees, hasAny]);

  const setCell = (m: FeeMethod, p: FeePart) =>
    setDraft(prev => ({ ...prev, [m]: p }));

  const hasAnyDraft = FEE_METHODS.some(m => draft[m]?.bps || draft[m]?.cents);

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
                  if (confirm('Remover todas as taxas personalizadas deste usuário?')) onSave(null);
                }}
                title="Resetar para taxa geral"
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
                Preencha só os métodos que precisam de taxa diferente da geral. Campos vazios herdam a taxa padrão.
              </p>
              <table className="table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th className="w-28">Método</th>
                    <th>Taxa geral (herdada)</th>
                    <th>Taxa personalizada (% + R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_METHODS.map(m => {
                    const meta  = METHOD_META[m];
                    const Icon  = meta.icon;
                    const general = generalFees?.[m]?.platform ?? {};
                    return (
                      <tr key={m}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: meta.color }} />
                            <span className="font-medium text-text">{meta.label}</span>
                          </div>
                        </td>
                        <td className="text-text3 text-xs">{formatPart(general)}</td>
                        <td className="w-80">
                          <FeePartInputs
                            part={draft[m] ?? {}}
                            onChange={(p) => setCell(m, p)}
                            compact
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => onSave(hasAnyDraft ? draft : null)}
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
